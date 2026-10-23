import { Types } from 'mongoose';
import { User, IUserProfile } from './user.model';
import { Listing } from '../listings/listing.model';
import { NotFoundError, BadRequestError } from '../../core/errors/AppError';

export class UserService {
  /**
   * 4.1 Get Authenticated User Profile
   */
  public static async getSelfProfile(userId: string) {
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      userId: user._id.toString(),
      mobileNumber: user.mobileNumber,
      role: user.role,
      accountStatus: user.accountStatus,
      isNidVerified: user.isNidVerified,
      profile: {
        displayName: user.profile.displayName,
        avatarUrl: user.profile.avatarUrl,
        bio: user.profile.bio,
        division: user.profile.division,
        district: user.profile.district,
        thana: user.profile.thana,
      },
      ratings: {
        average: user.ratingAverage,
        count: user.ratingCount,
      },
      boundDevicesCount: user.boundDevices.length,
      savedListingsCount: user.savedListings.length,
      memberSince: user.createdAt,
    };
  }

  /**
   * 4.2 Update User Profile & Privacy Settings
   */
  public static async updateProfile(userId: string, updateData: Partial<IUserProfile>) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (updateData.displayName !== undefined) user.profile.displayName = updateData.displayName;
    if (updateData.avatarUrl !== undefined) user.profile.avatarUrl = updateData.avatarUrl;
    if (updateData.bio !== undefined) user.profile.bio = updateData.bio;
    if (updateData.division !== undefined) user.profile.division = updateData.division;
    if (updateData.district !== undefined) user.profile.district = updateData.district;
    if (updateData.thana !== undefined) user.profile.thana = updateData.thana;

    await user.save();

    return {
      userId: user._id.toString(),
      profile: user.profile,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * 4.3 Check Daily Free Ad Quota Status (30 ads / rolling 24 hours)
   */
  public static async checkDailyQuota(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const DAILY_LIMIT = 30;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count listings created in the last rolling 24 hours
    const usedToday = await Listing.countDocuments({
      sellerId: new Types.ObjectId(userId),
      createdAt: { $gte: twentyFourHoursAgo },
      status: { $ne: 'DELETED' },
    });

    const remainingQuota = Math.max(DAILY_LIMIT - usedToday, 0);

    // Find the oldest listing within the 24h window to calculate exact reset seconds
    const oldestInWindow = await Listing.findOne({
      sellerId: new Types.ObjectId(userId),
      createdAt: { $gte: twentyFourHoursAgo },
      status: { $ne: 'DELETED' },
    })
      .sort({ createdAt: 1 })
      .select('createdAt');

    let resetsInSeconds = 0;
    if (oldestInWindow) {
      const windowExpiry = new Date(oldestInWindow.createdAt.getTime() + 24 * 60 * 60 * 1000);
      resetsInSeconds = Math.max(Math.ceil((windowExpiry.getTime() - Date.now()) / 1000), 0);
    }

    return {
      dailyQuotaLimit: DAILY_LIMIT,
      usedToday,
      remainingQuota,
      isLimitReached: usedToday >= DAILY_LIMIT,
      resetsInSeconds,
    };
  }

  /**
   * 4.4 Get Public Seller Profile & Feedback
   */
  public static async getPublicProfile(targetUserId: string) {
    const user = await User.findById(targetUserId).select(
      'profile isNidVerified ratingAverage ratingCount createdAt role'
    );

    if (!user || user.accountStatus === 'BANNED') {
      throw new NotFoundError('Seller profile not found or account is suspended');
    }

    // Count active listings currently posted by this seller
    const activeListingsCount = await Listing.countDocuments({
      sellerId: user._id,
      status: 'ACTIVE',
    });

    return {
      userId: user._id.toString(),
      displayName: user.profile.displayName || 'Seller',
      avatarUrl: user.profile.avatarUrl || null,
      bio: user.profile.bio || null,
      location: {
        division: user.profile.division || null,
        district: user.profile.district || null,
        thana: user.profile.thana || null,
      },
      isNidVerified: user.isNidVerified,
      blueShieldActive: user.isNidVerified,
      ratingAverage: user.ratingAverage,
      ratingCount: user.ratingCount,
      memberSince: user.createdAt,
      activeListingsCount,
    };
  }

  /**
   * 4.5 Save / Bookmark a Listing (Toggle)
   */
  public static async toggleSavedListing(userId: string, listingId: string) {
    const listing = await Listing.findById(listingId);
    if (!listing || listing.status === 'DELETED') {
      throw new NotFoundError('Listing not found or no longer available');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const objectId = new Types.ObjectId(listingId);
    const existingIndex = user.savedListings.findIndex((id) => id.equals(objectId));

    let isSaved = false;
    if (existingIndex >= 0) {
      // Remove bookmark
      user.savedListings.splice(existingIndex, 1);
      isSaved = false;
    } else {
      // Add bookmark
      user.savedListings.push(objectId);
      isSaved = true;
    }

    await user.save();

    return {
      listingId,
      isSaved,
      totalSavedCount: user.savedListings.length,
      message: isSaved ? 'Listing bookmarked successfully.' : 'Bookmark removed successfully.',
    };
  }

  /**
   * 4.6 List User's Saved Bookmarks
   */
  public static async getSavedListings(userId: string, page = 1, limit = 20) {
    const user = await User.findById(userId).select('savedListings');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const total = user.savedListings.length;
    const skip = (page - 1) * limit;
    const paginatedIds = user.savedListings.slice(skip, skip + limit);

    const listings = await Listing.find({
      _id: { $in: paginatedIds },
      status: { $ne: 'DELETED' },
    })
      .select('title price condition location images status boost createdAt')
      .populate('sellerId', 'profile.displayName isNidVerified');

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      listings,
    };
  }
}

export default UserService;
