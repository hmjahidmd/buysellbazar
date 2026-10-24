import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { connectToDatabase } from '../../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  'your_ultra_secure_jwt_access_secret_key_minimum_32_characters';

type RouteContext = { params: { slug: string[] } | Promise<{ slug: string[] }> };

async function getSlug(context: RouteContext): Promise<string> {
  const params = await Promise.resolve(context.params);
  return (params?.slug || []).join('/');
}

function fail(message: string, status = 500) {
  return NextResponse.json(
    { success: false, error: { message }, message },
    { status }
  );
}

// Define Mongoose Models (re-usable across serverless invocations)
const UserSchema = new Schema(
  {
    mobileNumber: { type: String, required: true, unique: true },
    role: { type: String, default: 'buyer' },
    isNidVerified: { type: Boolean, default: false },
    accountStatus: { type: String, default: 'ACTIVE' },
    profile: {
      displayName: { type: String, default: 'Verified User' },
      avatarUrl: { type: String, default: '' },
      bio: { type: String, default: '' },
      division: { type: String, default: 'Dhaka' },
      district: { type: String, default: 'Dhaka' },
      thana: { type: String, default: 'Mirpur' },
    },
    ratingAverage: { type: Number, default: 5 },
    ratingCount: { type: Number, default: 0 },
    savedListings: [{ type: Schema.Types.ObjectId, ref: 'Listing' }],
  },
  { timestamps: true }
);

const ListingSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    slug: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: String,
    specifications: [{ key: String, value: String }],
    price: { type: Number, required: true },
    isNegotiable: { type: Boolean, default: true },
    condition: { type: String, default: 'USED' },
    location: {
      division: { type: String, default: 'Dhaka' },
      district: { type: String, default: 'Dhaka' },
      thana: { type: String, default: 'Mirpur' },
    },
    images: [
      {
        url: String,
        thumbnailUrl: String,
        isPrimary: Boolean,
      },
    ],
    metrics: {
      viewsCount: { type: Number, default: 0 },
      chatLeadsCount: { type: Number, default: 0 },
      offerCount: { type: Number, default: 0 },
    },
    status: { type: String, default: 'PENDING' },
    boost: {
      isTopAd: { type: Boolean, default: false },
      isBumped: { type: Boolean, default: false },
      topAdExpiresAt: Date,
    },
    expiresAt: Date,
  },
  { timestamps: true }
);

const OfferSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing' },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User' },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    offeredPrice: { type: Number, required: true },
    status: { type: String, default: 'PENDING' },
  },
  { timestamps: true }
);

const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing' },
    transactionRef: { type: String, required: true },
    gateway: { type: String, default: 'BKASH' },
    amount: { type: Number, required: true },
    status: { type: String, default: 'INITIATED' },
    boostType: { type: String, default: 'TOP_AD_7D' },
  },
  { timestamps: true }
);

const ChatMessageSchema = new Schema(
  {
    roomId: { type: String, required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing' },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    messageType: { type: String, default: 'TEXT' },
    isScamFlagged: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    attachmentUrl: String,
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const ListingModel = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
const OfferModel = mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
const ChatMessageModel = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

// Auth Token Helper
function getAuthUser(req: NextRequest): { userId: string; mobileNumber: string; role: string; isNidVerified: boolean } | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId || decoded.id,
      mobileNumber: decoded.mobileNumber,
      role: decoded.role || 'buyer',
      isNidVerified: Boolean(decoded.isNidVerified),
    };
  } catch {
    return null;
  }
}

function requireRole(req: NextRequest, roles: string[]) {
  const auth = getAuthUser(req);
  if (!auth) return { auth: null, response: fail('Unauthorized', 401) };
  if (!roles.includes(auth.role)) return { auth, response: fail('Admin access required', 403) };
  return { auth, response: null };
}

function createListingSlug(title: string) {
  const base = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'listing';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// -------------------------------------------------------------
// GET Handler
// -------------------------------------------------------------
export async function GET(req: NextRequest, context: RouteContext) {
  try {
  await connectToDatabase();
  const slug = await getSlug(context);
  const url = new URL(req.url);

  if (slug === 'admin/moderation/listings/queue') {
    const access = requireRole(req, ['admin', 'moderator']);
    if (access.response) return access.response;
    const listings = await ListingModel.find({ status: 'PENDING' })
      .populate('sellerId', 'profile.displayName mobileNumber isNidVerified')
      .sort({ createdAt: 1 }).limit(50).lean();
    return NextResponse.json({ success: true, data: { total: listings.length, listings } });
  }

  if (slug === 'admin/moderation/listings') {
    const access = requireRole(req, ['admin', 'moderator']);
    if (access.response) return access.response;
    const q = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status');
    const filter: any = {};
    if (status) filter.status = status;
    if (q) {
      const conditions: any[] = [{ title: { $regex: escapeRegex(q), $options: 'i' } }];
      if (mongoose.Types.ObjectId.isValid(q)) conditions.push({ _id: new mongoose.Types.ObjectId(q) });
      filter.$or = conditions;
    }
    const listings = await ListingModel.find(filter)
      .populate('sellerId', 'profile.displayName mobileNumber')
      .sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ success: true, data: { total: listings.length, listings } });
  }

  if (slug === 'admin/moderation/queue') {
    const access = requireRole(req, ['admin', 'moderator']);
    if (access.response) return access.response;
    return NextResponse.json({ success: true, data: { total: 0, queue: [] } });
  }

  // 1. GET /api/v1/listings/search
  if (slug === 'listings/search') {
    const q = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const division = url.searchParams.get('division');
    const limit = Number(url.searchParams.get('limit')) || 20;

    const filter: any = { status: 'ACTIVE' };
    if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };
    if (category && category !== 'All Categories') filter.category = { $regex: `^${category}$`, $options: 'i' };
    if (division && division !== 'All Bangladesh') filter['location.division'] = { $regex: `^${division}$`, $options: 'i' };

    const results = await ListingModel.find(filter)
      .populate('sellerId', 'profile.displayName profile.avatarUrl isNidVerified ratingAverage ratingCount')
      .sort({ 'boost.isTopAd': -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        results,
      },
    });
  }

  // 2. GET /api/v1/listings/my-listings
  if (slug === 'listings/my-listings') {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const listings = await ListingModel.find({
      sellerId: new mongoose.Types.ObjectId(auth.userId),
      status: { $ne: 'DELETED' },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        total: listings.length,
        listings,
      },
    });
  }

  // 3. GET /api/v1/listings/:id
  if (slug.startsWith('listings/')) {
    const id = slug.replace('listings/', '');
    const lookup = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id };
    const listing = await ListingModel.findOne(lookup)
      .populate('sellerId', 'profile.displayName profile.avatarUrl isNidVerified ratingAverage ratingCount createdAt')
      .lean();
    if (listing && listing.status === 'ACTIVE') {
      return NextResponse.json({ success: true, data: listing });
    }
    return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
  }

  if (slug === 'users/me/saved-listings') {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const user = await UserModel.findById(auth.userId).select('savedListings').lean();
    const listings = user?.savedListings?.length
      ? await ListingModel.find({ _id: { $in: user.savedListings }, status: 'ACTIVE' }).lean()
      : [];
    return NextResponse.json({ success: true, data: { total: listings.length, listings } });
  }

  // 4. GET /api/v1/users/me
  if (slug === 'users/me') {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(auth.userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user._id.toString(),
        mobileNumber: user.mobileNumber,
        role: user.role,
        isNidVerified: Boolean(user.isNidVerified),
        accountStatus: user.accountStatus,
        profile: user.profile,
        memberSince: user.createdAt,
      },
    });
  }

  // 5. GET /api/v1/users/me/quota
  if (slug === 'users/me/quota') {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const dailyAdCount = await ListingModel.countDocuments({
      sellerId: new mongoose.Types.ObjectId(auth.userId),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: { $ne: 'DELETED' },
    });
    return NextResponse.json({
      success: true,
      data: {
        dailyAdCount,
        maxFreePerDay: 30,
        remainingToday: Math.max(0, 30 - dailyAdCount),
      },
    });
  }

  if (slug === 'chats') {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const userId = new mongoose.Types.ObjectId(auth.userId);
    const messages = await ChatMessageModel.find({ $or: [{ senderId: userId }, { recipientId: userId }] })
      .sort({ createdAt: -1 }).lean();
    const latestByRoom = new Map<string, typeof messages[number]>();
    for (const message of messages) if (!latestByRoom.has(message.roomId)) latestByRoom.set(message.roomId, message);
    const inbox = await Promise.all(Array.from(latestByRoom.entries()).map(async ([roomId, lastMessage]) => {
      const listing = await ListingModel.findById(lastMessage.listingId).select('title price images status').lean();
      const counterpartId = lastMessage.senderId?.equals(userId) ? lastMessage.recipientId : lastMessage.senderId;
      const counterpart = counterpartId
        ? await UserModel.findById(counterpartId).select('profile.displayName profile.avatarUrl isNidVerified').lean()
        : null;
      const unreadCount = await ChatMessageModel.countDocuments({ roomId, recipientId: userId, isRead: false });
      return { roomId, listing, counterpart, lastMessage, unreadCount };
    }));
    return NextResponse.json({ success: true, data: { total: inbox.length, inbox } });
  }

  // 6. GET /api/v1/chats/:roomId/messages
  if (slug.startsWith('chats/') && slug.endsWith('/messages')) {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const roomId = slug.replace('chats/', '').replace('/messages', '');
    const [, listingId, buyerId] = roomId.split('_');
    if (!mongoose.Types.ObjectId.isValid(listingId) || !mongoose.Types.ObjectId.isValid(buyerId)) return fail('Invalid room', 400);
    const listing = await ListingModel.findById(listingId).select('sellerId').lean();
    if (!listing || (auth.userId !== buyerId && listing.sellerId?.toString() !== auth.userId)) return fail('Chat access denied', 403);
    const messages = await ChatMessageModel.find({ roomId })
      .populate('senderId', 'profile.displayName')
      .sort({ createdAt: 1 })
      .lean();

    await ChatMessageModel.updateMany({ roomId, recipientId: auth.userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });

    return NextResponse.json({
      success: true,
      data: {
        roomId,
        messages,
      },
    });
  }

  return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
  } catch (err: any) {
    console.error('GET /api/v1 failed', err);
    return fail(err?.message || 'Internal server error');
  }
}

// -------------------------------------------------------------
// POST Handler
// -------------------------------------------------------------
export async function POST(req: NextRequest, context: RouteContext) {
  try {
  const slug = await getSlug(context);
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // 1. POST /api/v1/auth/request-otp — no DB required (sandbox OTP)
  if (slug === 'auth/request-otp') {
    return NextResponse.json({ success: true, expiresInSeconds: 180 });
  }

  await connectToDatabase();

  const reviewMatch = slug.match(/^admin\/moderation\/listings\/([0-9a-fA-F]{24})\/review$/);
  if (reviewMatch) {
    const access = requireRole(req, ['admin', 'moderator']);
    if (access.response) return access.response;
    const statusByAction: Record<string, string> = { APPROVE: 'ACTIVE', REJECT: 'REJECTED', DELETE: 'DELETED' };
    const nextStatus = statusByAction[body.action];
    if (!nextStatus) return fail('Invalid review action', 400);
    const listing = await ListingModel.findOneAndUpdate(
      { _id: reviewMatch[1], status: 'PENDING' },
      { $set: { status: nextStatus } },
      { new: true }
    );
    if (!listing) return fail('Pending listing not found or already reviewed', 404);
    return NextResponse.json({ success: true, data: { listingId: listing._id, status: nextStatus } });
  }

  // 2. POST /api/v1/auth/verify-otp
  if (slug === 'auth/verify-otp') {
    const { mobileNumber } = body;
    let user = await UserModel.findOne({ mobileNumber });
    if (!user) {
      user = await UserModel.create({
        mobileNumber: mobileNumber || '01712345678',
        role: 'user',
        isNidVerified: true,
        profile: {
          displayName: 'Verified Seller',
          avatarUrl: '',
          bio: '',
        },
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        mobileNumber: user.mobileNumber,
        role: user.role,
        isNidVerified: user.isNidVerified,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      data: {
        accessToken: token,
        refreshToken: token,
        user: {
          id: user._id.toString(),
          mobileNumber: user.mobileNumber,
          role: user.role,
          isNidVerified: user.isNidVerified,
          profile: user.profile,
        },
      },
    });
  }

  // 3. POST /api/v1/kyc/complete-kyc
  if (slug === 'kyc/complete-kyc') {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findByIdAndUpdate(
      auth.userId,
      { $set: { isNidVerified: true } },
      { new: true }
    );

    const newToken = jwt.sign(
      {
        userId: user._id.toString(),
        mobileNumber: user.mobileNumber,
        role: user.role,
        isNidVerified: true,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      data: {
        accessToken: newToken,
        user: {
          id: user._id.toString(),
          isNidVerified: true,
          profile: user.profile,
        },
      },
    });
  }

  // 4. POST /api/v1/listings (Create Listing)
  if (slug === 'listings') {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const user = await UserModel.findById(auth.userId).select('isNidVerified').lean();
    if (!user?.isNidVerified) return fail('Identity verification is required before posting', 403);
    const adCount = await ListingModel.countDocuments({
      sellerId: new mongoose.Types.ObjectId(auth.userId),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: { $ne: 'DELETED' },
    });
    if (adCount >= 30) return fail('Daily listing limit reached', 429);

    const imagesFormatted = (body.images || []).map((img: any, idx: number) => ({
      url: typeof img === 'string' ? img : img.url,
      thumbnailUrl: typeof img === 'string' ? img : img.url,
      isPrimary: idx === 0,
    }));

    if (imagesFormatted.length === 0) {
      imagesFormatted.push({
        url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800',
        thumbnailUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=200',
        isPrimary: true,
      });
    }

    const listing = await ListingModel.create({
      sellerId: new mongoose.Types.ObjectId(auth.userId),
      title: body.title,
      description: body.description,
      category: body.category || 'Mobiles',
      subCategory: body.subCategory || body.category || 'Mobiles',
      specifications: Array.isArray(body.specifications) ? body.specifications : [],
      slug: createListingSlug(body.title || 'listing'),
      price: Number(body.price),
      isNegotiable: Boolean(body.isNegotiable),
      condition: body.condition || 'USED',
      location: body.location || { division: 'Dhaka', district: 'Dhaka', thana: 'Mirpur' },
      images: imagesFormatted,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...listing.toObject(),
        id: listing._id.toString(),
        listingId: listing._id.toString(),
      },
    });
  }

  const savedMatch = slug.match(/^users\/me\/saved-listings\/([0-9a-fA-F]{24})$/);
  if (savedMatch) {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const user = await UserModel.findById(auth.userId);
    if (!user) return fail('User not found', 404);
    const listingId = new mongoose.Types.ObjectId(savedMatch[1]);
    const existingIndex = user.savedListings.findIndex((id: mongoose.Types.ObjectId) => id.equals(listingId));
    if (existingIndex >= 0) user.savedListings.splice(existingIndex, 1);
    else user.savedListings.push(listingId);
    await user.save();
    return NextResponse.json({ success: true, data: { isSaved: existingIndex < 0, totalSavedCount: user.savedListings.length } });
  }

  // 5. POST /api/v1/listings/:id/mark-sold
  if (slug.startsWith('listings/') && slug.endsWith('/mark-sold')) {
    const id = slug.replace('listings/', '').replace('/mark-sold', '');
    await ListingModel.findByIdAndUpdate(id, { $set: { status: 'SOLD' } });
    return NextResponse.json({ success: true, message: 'Marked as sold' });
  }

  // 6. POST /api/v1/offers/:listingId
  if (slug.startsWith('offers/')) {
    const auth = getAuthUser(req);
    const listingId = slug.replace('offers/', '');
    const offer = await OfferModel.create({
      listingId: new mongoose.Types.ObjectId(listingId),
      buyerId: auth ? new mongoose.Types.ObjectId(auth.userId) : undefined,
      offeredPrice: Number(body.offeredPrice),
      status: 'PENDING',
    });
    return NextResponse.json({ success: true, data: offer });
  }

  // 7. POST /api/v1/boosts/checkout
  if (slug === 'boosts/checkout') {
    const auth = getAuthUser(req);
    const transactionRef = `TXN_BK_${Date.now()}`;
    const payment = await PaymentModel.create({
      userId: auth ? new mongoose.Types.ObjectId(auth.userId) : undefined,
      listingId: mongoose.Types.ObjectId.isValid(body.targetId)
        ? new mongoose.Types.ObjectId(body.targetId)
        : undefined,
      transactionRef,
      gateway: body.gateway || 'BKASH',
      amount: 499,
      status: 'INITIATED',
      boostType: body.boostType || 'TOP_AD_7D',
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment._id.toString(),
        transactionRef,
      },
    });
  }

  // 8. POST /api/v1/payments/mfs-callback
  if (slug === 'payments/mfs-callback') {
    const { transactionRef } = body;
    const payment = await PaymentModel.findOne({ transactionRef });
    if (payment && payment.listingId) {
      payment.status = 'PAID';
      await payment.save();
      await ListingModel.findByIdAndUpdate(payment.listingId, {
        $set: {
          'boost.isTopAd': true,
          'boost.topAdExpiresAt': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
    return NextResponse.json({ success: true, acknowledged: true });
  }

  // 9. POST /api/v1/chats/start/:listingId
  if (slug.startsWith('chats/start/')) {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const listingId = slug.replace('chats/start/', '');
    if (!mongoose.Types.ObjectId.isValid(listingId)) return fail('Invalid listing ID', 400);
    const listing = await ListingModel.findById(listingId).populate('sellerId', 'profile.displayName profile.avatarUrl isNidVerified').lean();
    if (!listing || listing.status !== 'ACTIVE') return fail('Listing is not available', 404);
    if (listing.sellerId?._id?.toString() === auth.userId || listing.sellerId?.toString() === auth.userId) return fail('You cannot chat with yourself', 400);
    if (!auth.isNidVerified) return fail('Identity verification is required before contacting sellers', 403);
    await ListingModel.findByIdAndUpdate(listingId, { $inc: { 'metrics.chatLeadsCount': 1 } });
    const roomId = `room_${listingId}_${auth.userId}`;
    return NextResponse.json({
      success: true,
      data: { roomId, listing: { listingId, title: listing.title, price: listing.price, images: listing.images, status: listing.status }, seller: listing.sellerId },
    });
  }

  // 10. POST /api/v1/chats/:roomId/messages
  if (slug.startsWith('chats/') && slug.endsWith('/messages')) {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const roomId = slug.replace('chats/', '').replace('/messages', '');
    const [, listingId, buyerId] = roomId.split('_');
    if (!mongoose.Types.ObjectId.isValid(listingId) || !mongoose.Types.ObjectId.isValid(buyerId)) return fail('Invalid chat room', 400);
    const listing = await ListingModel.findById(listingId).select('sellerId status').lean();
    if (!listing || listing.status !== 'ACTIVE') return fail('Listing is not available', 404);
    const sellerId = listing.sellerId?.toString();
    if (auth.userId !== buyerId && auth.userId !== sellerId) return fail('Chat access denied', 403);
    const recipientId = auth.userId === buyerId ? sellerId : buyerId;
    const scamRegex = /(bkash|nagad|rocket)\s*(advance|agrim|charge|delivery\s*fee|courier|fee|pathan|taka\s*pathan)|(courier\s*(charge|fee))|(advance\s*(fee|charge|taka))|(কুরিয়ার\s*চার্জ|অগ্রিম|বিকাশ\s*করুন)/i;
    const isScamFlagged = scamRegex.test(String(body.content || ''));
    const msg = await ChatMessageModel.create({
      roomId,
      listingId: new mongoose.Types.ObjectId(listingId),
      senderId: auth ? new mongoose.Types.ObjectId(auth.userId) : undefined,
      recipientId: new mongoose.Types.ObjectId(recipientId),
      content: body.content,
      messageType: 'TEXT',
      isScamFlagged,
    });
    let warningMessage;
    if (isScamFlagged) {
      warningMessage = await ChatMessageModel.create({
        roomId,
        listingId: new mongoose.Types.ObjectId(listingId),
        senderId: new mongoose.Types.ObjectId(auth.userId),
        recipientId: new mongoose.Types.ObjectId(recipientId),
        content: 'সতর্কতা: কোনো পণ্য বা কুরিয়ার ফি বাবদ অগ্রিম টাকা পাঠাবেন না। পণ্য সামনাসামনি দেখে যাচাই করে লেনদেন করুন।',
        messageType: 'SYSTEM_WARNING',
        isScamFlagged: true,
      });
    }
    return NextResponse.json({ success: true, data: { message: msg, warningMessage } });
  }

  return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
  } catch (err: any) {
    console.error('POST /api/v1 failed', err);
    return fail(err?.message || 'Internal server error');
  }
}

// -------------------------------------------------------------
// PATCH Handler
// -------------------------------------------------------------
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
  await connectToDatabase();
  const slug = await getSlug(context);
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const reviewMatch = slug.match(/^admin\/moderation\/listings\/([0-9a-fA-F]{24})\/review$/);
  if (reviewMatch) {
    const access = requireRole(req, ['admin', 'moderator']);
    if (access.response) return access.response;
    const statusByAction: Record<string, string> = { APPROVE: 'ACTIVE', REJECT: 'REJECTED', DELETE: 'DELETED' };
    const nextStatus = statusByAction[body.action];
    if (!nextStatus) return fail('Invalid review action', 400);
    const listing = await ListingModel.findOneAndUpdate(
      { _id: reviewMatch[1], status: 'PENDING' },
      { $set: { status: nextStatus } },
      { new: true }
    );
    if (!listing) return fail('Pending listing not found or already reviewed', 404);
    return NextResponse.json({ success: true, data: { listingId: listing._id, status: nextStatus } });
  }

  // 1. PATCH /api/v1/users/me (Update User Profile)
  if (slug === 'users/me') {
    const auth = getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const updateFields: any = {};
    if (body.displayName) updateFields['profile.displayName'] = body.displayName;
    if (body.avatarUrl !== undefined) updateFields['profile.avatarUrl'] = body.avatarUrl;
    if (body.bio !== undefined) updateFields['profile.bio'] = body.bio;

    const user = await UserModel.findByIdAndUpdate(
      auth.userId,
      { $set: updateFields },
      { new: true }
    ).lean();

    return NextResponse.json({
      success: true,
      data: { profile: user.profile },
    });
  }

  // 2. PATCH /api/v1/listings/:id (Update Listing)
  if (slug.startsWith('listings/')) {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const id = slug.replace('listings/', '');
    if (!mongoose.Types.ObjectId.isValid(id)) return fail('Invalid listing ID', 400);
    const existing = await ListingModel.findById(id).select('sellerId').lean();
    if (!existing) return fail('Listing not found', 404);
    if (existing.sellerId?.toString() !== auth.userId) return fail('Listing access denied', 403);
    const updated = await ListingModel.findByIdAndUpdate(
      id,
      {
        $set: {
          title: body.title,
          price: body.price,
          description: body.description,
          condition: body.condition,
          isNegotiable: body.isNegotiable,
        },
      },
      { new: true }
    );
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
  } catch (err: any) {
    console.error('PATCH /api/v1 failed', err);
    return fail(err?.message || 'Internal server error');
  }
}

// -------------------------------------------------------------
// DELETE Handler
// -------------------------------------------------------------
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
  await connectToDatabase();
  const slug = await getSlug(context);

  const adminListingMatch = slug.match(/^admin\/moderation\/listings\/([0-9a-fA-F]{24})$/);
  if (adminListingMatch) {
    const access = requireRole(req, ['admin', 'moderator']);
    if (access.response) return access.response;
    const listing = await ListingModel.findByIdAndUpdate(
      adminListingMatch[1],
      { $set: { status: 'DELETED' } },
      { new: true }
    );
    if (!listing) return fail('Listing not found', 404);
    return NextResponse.json({ success: true, data: { listingId: listing._id, status: 'DELETED' } });
  }

  // DELETE /api/v1/listings/:id (Soft-Delete)
  if (slug.startsWith('listings/')) {
    const auth = getAuthUser(req);
    if (!auth) return fail('Unauthorized', 401);
    const id = slug.replace('listings/', '');
    if (!mongoose.Types.ObjectId.isValid(id)) return fail('Invalid listing ID', 400);
    const listing = await ListingModel.findOneAndUpdate(
      { _id: id, sellerId: new mongoose.Types.ObjectId(auth.userId), status: { $ne: 'DELETED' } },
      { $set: { status: 'DELETED' } }
    );
    if (!listing) return fail('Listing not found or access denied', 404);
    return NextResponse.json({ success: true, message: 'Listing deleted' });
  }

  return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
  } catch (err: any) {
    console.error('DELETE /api/v1 failed', err);
    return fail(err?.message || 'Internal server error');
  }
}
