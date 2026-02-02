import { MongoClient, Db, Collection } from "mongodb";
import { v4 as uuidv4 } from "uuid";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || "imgate";

export interface Asset {
  assetId: string;
  slug: string;
  creatorAddress: string;
  paymentAddress?: string; // Payment recipient address (can differ from creator)
  originHash: string;
  previewCID: string; // IPFS CID for preview
  encryptedCID: string; // IPFS CID for encrypted original
  encryptionKey: string; // Stored securely, never exposed publicly
  priceUSDC: string;
  filename: string;
  width: number;
  height: number;
  c2paManifestPresent: boolean;
  c2paSigner?: string;
  c2paSigningTime?: string;
  c2paClaims?: any;
  createdAt: number;
  // Promotional metadata for AI-powered creator promotion
  creatorName?: string;
  twitterHandle?: string;
  creatorBio?: string;
  description?: string; // Image description for search
  creatorAvatar?: string; // IPFS CID for creator avatar
}

export interface Purchase {
  assetId: string;
  payer: string;
  txHash: string;
  amount: string;
  expiresAt: number;
  timestamp: number;
}

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB
 */
async function connectDB(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
    // Create indexes
    await db.collection("assets").createIndex({ slug: 1 }, { unique: true });
    await db.collection("assets").createIndex({ assetId: 1 }, { unique: true });
    await db.collection("assets").createIndex({ creatorAddress: 1 });
    await db.collection("purchases").createIndex({ assetId: 1, payer: 1 });
    
    console.log("Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

/**
 * Get assets collection
 */
async function getAssetsCollection(): Promise<Collection<Asset>> {
  const database = await connectDB();
  return database.collection<Asset>("assets");
}

/**
 * Get purchases collection
 */
async function getPurchasesCollection(): Promise<Collection<Purchase>> {
  const database = await connectDB();
  return database.collection<Purchase>("purchases");
}

/**
 * Generate unique slug
 */
export function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 6; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

/**
 * Create asset
 */
export async function createAsset(asset: Omit<Asset, "assetId" | "slug" | "createdAt">): Promise<Asset> {
  const collection = await getAssetsCollection();

  const newAsset: Asset = {
    ...asset,
    assetId: uuidv4(),
    slug: generateSlug(),
    createdAt: Date.now(),
  };

  await collection.insertOne(newAsset as any);
  return newAsset;
}

/**
 * Get asset by slug
 */
export async function getAssetBySlug(slug: string): Promise<Asset | null> {
  const collection = await getAssetsCollection();
  return await collection.findOne({ slug });
}

/**
 * Get asset by ID
 */
export async function getAssetById(assetId: string): Promise<Asset | null> {
  const collection = await getAssetsCollection();
  return await collection.findOne({ assetId });
}

/**
 * Get assets by creator
 */
export async function getAssetsByCreator(creatorAddress: string): Promise<Asset[]> {
  const collection = await getAssetsCollection();
  return await collection
    .find({ creatorAddress: { $regex: new RegExp(`^${creatorAddress}$`, "i") } })
    .toArray();
}

/**
 * Search assets by query string (matches filename, creator name, bio, or tags)
 */
export async function searchAssets(query: string): Promise<{ assets: Asset[], isFallback: boolean }> {
  const collection = await getAssetsCollection();
  
  // 1. If query is empty, return latest matching nothing (explore mode)
  if (!query || query.trim() === '') {
    const assets = await collection.find({}).sort({ createdAt: -1 }).limit(20).toArray();
    return { assets, isFallback: false };
  }
  
  // 2. Simplified Search: Only search description using AND logic for all terms
  const terms = query.split(/\s+/).filter(t => t.length > 0);
  const termRegexes = terms.map(t => new RegExp(t, "i"));

  // Find assets where description contains ALL keywords
  const assets = await collection.find({
    $and: termRegexes.map(rx => ({ description: rx }))
  }).limit(20).toArray();

  if (assets.length > 0) return { assets, isFallback: false };

  // 3. Fallback: Try looser OR search (match ANY term in description)
  if (terms.length > 1) {
    const looseAssets = await collection.find({
       description: { $in: termRegexes }
    }).limit(20).toArray();
    
    if (looseAssets.length > 0) return { assets: looseAssets, isFallback: false };
  }

  // 4. No matches found
  return { assets: [], isFallback: false };
}

/**
 * Create purchase record
 */
export async function createPurchase(purchase: Purchase): Promise<void> {
  const collection = await getPurchasesCollection();
  await collection.insertOne(purchase as any);
}

/**
 * Get purchase by payer and asset
 */
export async function getPurchase(
  payer: string,
  assetId: string
): Promise<Purchase | null> {
  const collection = await getPurchasesCollection();
  return await collection.findOne({
    payer: { $regex: new RegExp(`^${payer}$`, "i") },
    assetId,
  });
}

/**
 * Get all purchases for an asset
 */
export async function getPurchasesByAsset(assetId: string): Promise<Purchase[]> {
  const collection = await getPurchasesCollection();
  return await collection.find({ assetId }).toArray();
}

/**
 * Get all assets
 */
export async function getAllAssets(): Promise<Asset[]> {
  const collection = await getAssetsCollection();
  return await collection.find({}).toArray();
}

/**
 * Get all purchases
 */
export async function getAllPurchases(): Promise<Purchase[]> {
  const collection = await getPurchasesCollection();
  return await collection.find({}).toArray();
}
