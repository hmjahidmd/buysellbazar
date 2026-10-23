import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../../lib/db';

const JWT_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  'your_ultra_secure_jwt_access_secret_key_minimum_32_characters';

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
  },
  { timestamps: true }
);

const ListingSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
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
    status: { type: String, default: 'ACTIVE' },
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
    content: { type: String, required: true },
    messageType: { type: String, default: 'TEXT' },
    isScamFlagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const ListingModel = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
const OfferModel = mongoose.models.Offer || mongoose.model('Offer', OfferSchema);
const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
const ChatMessageModel = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

// Auth Token Helper
function getAuthUser(req: NextRequest): { userId: string; mobileNumber: string } | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      userId: decoded.userId || decoded.id,
      mobileNumber: decoded.mobileNumber,
    };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// GET Handler
// -------------------------------------------------------------
export async function GET(req: NextRequest, { params }: { params: { slug: string[] } }) {
  await connectToDatabase();
  const slug = params.slug.join('/');
  const url = new URL(req.url);

  // 1. GET /api/v1/listings/search
  if (slug === 'listings/search') {
    const q = url.searchParams.get('q');
    const category = url.searchParams.get('category');
    const division = url.searchParams.get('division');
    const limit = Number(url.searchParams.get('limit')) || 20;

    const filter: any = { status: { $ne: 'DELETED' } };
    if (q) filter.title = { $regex: q, $options: 'i' };
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
    if (mongoose.Types.ObjectId.isValid(id)) {
      const listing = await ListingModel.findById(id)
        .populate('sellerId', 'profile.displayName profile.avatarUrl isNidVerified ratingAverage ratingCount createdAt')
        .lean();
      if (listing && listing.status !== 'DELETED') {
        return NextResponse.json({ success: true, data: listing });
      }
    }
    return NextResponse.json({ success: false, error: 'Listing not found' }, { status: 404 });
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
    return NextResponse.json({
      success: true,
      data: {
        dailyAdCount: 1,
        maxFreePerDay: 30,
        remainingToday: 29,
      },
    });
  }

  // 6. GET /api/v1/chats/:roomId/messages
  if (slug.startsWith('chats/') && slug.endsWith('/messages')) {
    const roomId = slug.replace('chats/', '').replace('/messages', '');
    const messages = await ChatMessageModel.find({ roomId })
      .populate('senderId', 'profile.displayName')
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        roomId,
        messages,
      },
    });
  }

  return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
}

// -------------------------------------------------------------
// POST Handler
// -------------------------------------------------------------
export async function POST(req: NextRequest, { params }: { params: { slug: string[] } }) {
  await connectToDatabase();
  const slug = params.slug.join('/');
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // 1. POST /api/v1/auth/request-otp
  if (slug === 'auth/request-otp') {
    return NextResponse.json({ success: true, expiresInSeconds: 180 });
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
      price: Number(body.price),
      isNegotiable: Boolean(body.isNegotiable),
      condition: body.condition || 'USED',
      location: body.location || { division: 'Dhaka', district: 'Dhaka', thana: 'Mirpur' },
      images: imagesFormatted,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...listing.toObject(),
        id: listing._id.toString(),
      },
    });
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
    const listingId = slug.replace('chats/start/', '');
    const roomId = `room_${listingId}_${auth?.userId || 'guest'}`;
    return NextResponse.json({
      success: true,
      data: { roomId },
    });
  }

  // 10. POST /api/v1/chats/:roomId/messages
  if (slug.startsWith('chats/') && slug.endsWith('/messages')) {
    const auth = getAuthUser(req);
    const roomId = slug.replace('chats/', '').replace('/messages', '');
    const msg = await ChatMessageModel.create({
      roomId,
      senderId: auth ? new mongoose.Types.ObjectId(auth.userId) : undefined,
      content: body.content,
      messageType: 'TEXT',
      isScamFlagged: false,
    });
    return NextResponse.json({ success: true, data: msg });
  }

  return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
}

// -------------------------------------------------------------
// PATCH Handler
// -------------------------------------------------------------
export async function PATCH(req: NextRequest, { params }: { params: { slug: string[] } }) {
  await connectToDatabase();
  const slug = params.slug.join('/');
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

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
    const id = slug.replace('listings/', '');
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
}

// -------------------------------------------------------------
// DELETE Handler
// -------------------------------------------------------------
export async function DELETE(req: NextRequest, { params }: { params: { slug: string[] } }) {
  await connectToDatabase();
  const slug = params.slug.join('/');

  // DELETE /api/v1/listings/:id (Soft-Delete)
  if (slug.startsWith('listings/')) {
    const id = slug.replace('listings/', '');
    await ListingModel.findByIdAndUpdate(id, { $set: { status: 'DELETED' } });
    return NextResponse.json({ success: true, message: 'Listing deleted' });
  }

  return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
}
