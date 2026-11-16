import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./app/generated/prisma/client";
import { Role, StockMovementType } from "./app/generated/prisma/enums";

const databaseUrl = process.env.DATABASE_URL;
const superAdminEmail =
  process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || "max2030@gmail.com";
const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "";
const MIN_INITIAL_STOCK = 5;
const MAX_INITIAL_STOCK = 50;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to run the seed script.");
}

if (!superAdminPassword) {
  throw new Error("SUPER_ADMIN_PASSWORD must be set to run the seed script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

interface SeedColor {
  colorName: string;
  colorHex: string;
  images: string[];
}

interface SeedProduct {
  id: string;
  name: string;
  description: string;
  categorySlug: string;
  costPrice: number;
  sellingPrice: number;
  sizes: string[];
  colors: SeedColor[];
}

interface SeedCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export const products: SeedProduct[] = [
  {
    id: "hoodie-essential",
    name: "Essential Oversized Hoodie",
    categorySlug: "essentials",
    description:
      "Premium heavyweight cotton hoodie with an oversized fit for ultimate comfort and modern style.",
    costPrice: 0,
    sellingPrice: 59.99,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/1200x/c6/76/a7/c676a702803aa9f79c0d4d2b54a86260.jpg"] },
      { colorName: "Heather Gray", colorHex: "#8b8b8b", images: ["https://i.pinimg.com/1200x/e6/97/fb/e697fbe8c53e64980ddc8f9391b79775.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/ed/38/2c/ed382cada59979f8dedb86c4cb23bcd5.jpg"] },
    ],
  },
  {
    id: "sweatshirt-classic",
    name: "Classic Sweatshirt",
    categorySlug: "core",
    description: "Heavyweight fleece sweatshirt with a structured fit and soft brushed inside.",
    costPrice: 0,
    sellingPrice: 49.99,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/1200x/ac/03/e4/ac03e4d5d2d8717e450b9d07b4c75f40.jpg"] },
      { colorName: "Gray", colorHex: "#858585", images: ["https://i.pinimg.com/1200x/21/9d/cf/219dcf03c141d68bf8bb2d65b0215a92.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/19/e4/49/19e44987fa5207eb9f67bd78085dce85.jpg"] },
    ],
  },
  {
    id: "hoodie-zip-up",
    name: "Zip Up Hoodie",
    categorySlug: "layering",
    description: "A functional zip-up hoodie with premium drape and comfortable everyday warmth.",
    costPrice: 0,
    sellingPrice: 64.99,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { colorName: "Red", colorHex: "#dc2626", images: ["https://i.pinimg.com/1200x/31/f6/94/31f694f8955827b3cdfbd08c60dd1384.jpg"] },
      { colorName: "Gray", colorHex: "#858585", images: ["https://i.pinimg.com/1200x/d2/b3/e0/d2b3e010ef7c5caf1b6c80c61e15cb9f.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/e4/0e/eb/e40eeb5f0ec323219f5dd680c720c42f.jpg"] },
    ],
  },
  {
    id: "jacket-denim-puffer",
    name: "Patchwork Denim Puffer Jacket",
    categorySlug: "outerwear",
    description: "Quilted recycled insulation with patchworked rigid cotton denim in a boxy cropped cut.",
    costPrice: 0,
    sellingPrice: 129.99,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { colorName: "Light Wash", colorHex: "#8ba7c0", images: ["https://i.pinimg.com/736x/6e/49/eb/6e49eb3cf40c04b05b924dcf1982c4b9.jpg"] },
      { colorName: "Mid Wash", colorHex: "#4f6c88", images: ["https://i.pinimg.com/1200x/29/b4/9e/29b49eacc6eb772093e19a1c8e802a57.jpg"] },
      { colorName: "Dark Wash", colorHex: "#263d55", images: ["https://i.pinimg.com/1200x/3a/4d/5e/3a4d5e8c8f9b8d8e8c8f9b8d8e8c8f9b.jpg"] },
    ],
  },
  {
    id: "sweater-merino-ribbed",
    name: "Ribbed Merino Wool Sweater",
    categorySlug: "knitwear",
    description: "Superfine merino knit featuring tactile English rib stitches and an easy relaxed drape.",
    costPrice: 0,
    sellingPrice: 89.99,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { colorName: "Cream", colorHex: "#f0e9d8", images: ["https://i.pinimg.com/736x/09/65/3b/09653b0b61eafb9de1dcdccf180720d1.jpg"] },
      { colorName: "Green", colorHex: "#228B22", images: ["https://i.pinimg.com/1200x/7c/52/bc/7c52bca933b61f23257b485d8c4217e4.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/5d/8d/40/5d8d40875c02c01c04e17943375b6039.jpg"] },
    ],
  },
  {
    id: "jeans-relaxed-straight",
    name: "Relaxed Straight Selvedge Jeans",
    categorySlug: "denim",
    description: "Heavy 14oz Japanese shuttle-loom selvedge denim in a timeless mid-rise straight silhouette.",
    costPrice: 0,
    sellingPrice: 99.99,
    sizes: ["30", "32", "34", "36"],
    colors: [
      { colorName: "Light Blue", colorHex: "#9bbbd4", images: ["https://i.pinimg.com/736x/74/43/1d/74431d299abfd9113113120015018562.jpg"] },
      { colorName: "Indigo", colorHex: "#344c70", images: ["https://i.pinimg.com/1200x/cb/ac/1e/cbac1e29316fa8f83b36df26984d4225.jpg"] },
      { colorName: "Black", colorHex: "#252525", images: ["https://i.pinimg.com/736x/32/15/70/32157069681bb2a6cb3175652b27916f.jpg"] },
    ],
  },
  {
    id: "polo-classic",
    name: "Classic Cotton Polo",
    categorySlug: "essentials",
    description: "A versatile cotton polo shirt with a clean collar and comfortable everyday fit.",
    costPrice: 0,
    sellingPrice: 39.99,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { colorName: "White", colorHex: "#f5f5f2", images: ["https://i.pinimg.com/1200x/88/82/6e/88826ecd59c400ff528a4aa98e79d2fd.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/0a/42/d5/0a42d5dd4528dceee00e565dc435639e.jpg"] },
      { colorName: "Olive", colorHex: "#59624b", images: ["https://i.pinimg.com/736x/c8/6b/d9/c86bd98da5a00a6e1ee5d011deb797e4.jpg"] },
    ],
  },
  {
    id: "shirt-button-down",
    name: "Classic Button-Down Shirt",
    categorySlug: "shirts",
    description: "A comfortable button-down shirt with a timeless cut for work or everyday wear.",
    costPrice: 0,
    sellingPrice: 49.99,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { colorName: "White", colorHex: "#f5f5f2", images: ["https://i.pinimg.com/1200x/ca/85/4f/ca854ff5f6dcf4776346547c0763a81a.jpg"] },
      { colorName: "Light Blue", colorHex: "#a9c5dc", images: ["https://i.pinimg.com/1200x/e6/c7/ab/e6c7abb4130397b44381b990c3aecff2.jpg"] },
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/1200x/4a/3f/53/4a3f5303a6dda0d55c440d68bc2d94c9.jpg"] },
    ],
  },
  {
    id: "pants-chino",
    name: "Everyday Chino Pants",
    categorySlug: "bottoms",
    description: "Easy-wearing cotton chinos with a straight fit, made for everyday outfits.",
    costPrice: 0,
    sellingPrice: 59.99,
    sizes: ["30", "32", "34", "36", "38"],
    colors: [
      { colorName: "Khaki", colorHex: "#b4a078", images: ["https://i.pinimg.com/1200x/3c/25/f4/3c25f40a1d9bd5f59f9f293dcc3b23d8.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/80/ff/19/80ff198a44b417d1d27538ac5129f2de.jpg"] },
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/736x/6d/f1/3a/6df13a0b5c82092179af8b4dc1d85877.jpg"] },
    ],
  },
  {
    id: "tee-heavyweight-box",
    name: "Heavyweight Boxy Tee",
    categorySlug: "essentials",
    description: "260 GSM combed organic cotton jersey tee with a dropped shoulder and crisp neckband.",
    costPrice: 0,
    sellingPrice: 34.99,
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { colorName: "White", colorHex: "#f5f5f2", images: ["https://i.pinimg.com/736x/1c/bf/90/1cbf9074db697438d67335987c6d541a.jpg"] },
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/1200x/96/8e/0a/968e0afc12e5ef4e2d56cffa2bb63a60.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/5b/b0/f5/5bb0f543e9e07201c3db121c62d89d80.jpg"] },
      { colorName: "Olive", colorHex: "#59624b", images: ["https://i.pinimg.com/1200x/ae/84/42/ae8442cc9b05c9b80e34eb6f49c4e23b.jpg"] },
    ],
  },
  {
    id: "shirt-linen-relaxed",
    name: "Relaxed Linen Shirt",
    categorySlug: "shirts",
    description: "A breathable linen shirt with a relaxed shape and clean, versatile styling.",
    costPrice: 0,
    sellingPrice: 54.99,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { colorName: "Natural", colorHex: "#d8cbb2", images: ["https://i.pinimg.com/736x/52/5e/9f/525e9f61ef30787c1b451d429e56db99.jpg"] },
    ],
  },
  {
    id: "denim-jacket-classic",
    name: "Classic Denim Jacket",
    categorySlug: "denim",
    description: "A durable denim jacket with a timeless cut for easy everyday layering.",
    costPrice: 0,
    sellingPrice: 89.99,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/1200x/1d/6e/15/1d6e152f67e77424dd6b5c1fa0ab4231.jpg"] },
      { colorName: "Indigo", colorHex: "#344c70", images: ["https://i.pinimg.com/1200x/e0/e6/6a/e0e66a7bd76f12c1940eba0f52fb447c.jpg"] },
    ],
  },
  {
    id: "layering-cardigan-open",
    name: "Open-Knit Layering Cardigan",
    categorySlug: "layering",
    description: "A lightweight open-knit cardigan designed for comfortable, effortless layering.",
    costPrice: 0,
    sellingPrice: 69.99,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ colorName: "Oatmeal", colorHex: "#d6c9b2", images: ["https://i.pinimg.com/1200x/ef/28/a1/ef28a1801baed46c6a5adad0058bd3a9.jpg"] }],
  },
  {
    id: "tee-essential-long-sleeve",
    name: "Essential Long Sleeve Tee",
    categorySlug: "essentials",
    description: "A soft cotton long sleeve tee with a comfortable fit for daily wear.",
    costPrice: 0,
    sellingPrice: 39.99,
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { colorName: "White", colorHex: "#f5f5f2", images: ["https://i.pinimg.com/1200x/fe/5f/f7/fe5ff79ce968c222a4ecf80f786072a1.jpg"] },
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/1200x/95/89/f2/9589f2cbf5faac632fa57583f56c2ed2.jpg"] },
      { colorName: "Navy", colorHex: "#24324f", images: ["https://i.pinimg.com/1200x/57/8b/c1/578bc1634990962890036464817ebf47.jpg"] },
    ],
  },
  {
    id: "knitwear-cable-crewneck",
    name: "Cable-Knit Crewneck Sweater",
    categorySlug: "knitwear",
    description: "A cozy cotton-blend sweater finished with a classic cable-knit texture.",
    costPrice: 0,
    sellingPrice: 84.99,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { colorName: "Cream", colorHex: "#f0e9d8", images: ["https://i.pinimg.com/1200x/3e/26/ee/3e26ee85cb87dce7485e459a4a676595.jpg"] },
      { colorName: "Green", colorHex: "#228B22", images: ["https://i.pinimg.com/736x/1e/23/38/1e233816aeabe057b6785874ee2bf379.jpg"] },
    ],
  },
  {
    id: "bottoms-wide-leg-trouser",
    name: "Wide-Leg Tailored Trousers",
    categorySlug: "bottoms",
    description: "Tailored trousers with a relaxed wide-leg shape and a clean front.",
    costPrice: 0,
    sellingPrice: 74.99,
    sizes: ["30", "32", "34", "36", "38"],
    colors: [{ colorName: "Charcoal", colorHex: "#454545", images: ["https://i.pinimg.com/736x/bf/94/76/bf9476bb76131e7a278a3e68da55320b.jpg"] }],
  },
  {
    id: "core-ribbed-tank",
    name: "Core Ribbed Tank Top",
    categorySlug: "core",
    description: "A fitted ribbed cotton tank with a simple silhouette for everyday outfits.",
    costPrice: 0,
    sellingPrice: 24.99,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [{ colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/736x/78/a7/08/78a70826a839bf8737e053318326c742.jpg"] }],
  },
  {
    id: "outerwear-trench-coat",
    name: "Modern Cotton Trench Coat",
    categorySlug: "outerwear",
    description: "A lightweight cotton trench coat with a versatile shape for transitional weather.",
    costPrice: 0,
    sellingPrice: 149.99,
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { colorName: "Stone", colorHex: "#b8aa91", images: ["https://i.pinimg.com/736x/af/74/f3/af74f3636a2c77f1530eb036023e2e24.jpg"] },
      { colorName: "Black", colorHex: "#1a1a1a", images: ["https://i.pinimg.com/1200x/1d/23/54/1d2354e702ab380552f5d7cc3027a5f7.jpg"] },
    ],
  },
  {
    id: "denim-wide-leg-jeans",
    name: "Wide-Leg Denim Jeans",
    categorySlug: "denim",
    description: "Everyday cotton denim jeans with a comfortable high rise and wide-leg fit.",
    costPrice: 0,
    sellingPrice: 94.99,
    sizes: ["28", "30", "32", "34", "36"],
    colors: [
      { colorName: "Mid Wash", colorHex: "#4f6c88", images: ["https://i.pinimg.com/736x/5b/1b/14/5b1b14ec8ebb872ff2c2f946d8a11d14.jpg"] },
      { colorName: "Black", colorHex: "#252525", images: ["https://i.pinimg.com/1200x/81/e7/4f/81e74fffd5f8f51c4dd3b63c21c97f17.jpg"] },
    ],
  },
  {
    id: "layering-overshirt-twill",
    name: "Cotton Twill Overshirt",
    categorySlug: "layering",
    description: "A sturdy cotton twill overshirt that works as a light jacket or a layering piece.",
    costPrice: 0,
    sellingPrice: 79.99,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [{ colorName: "Olive", colorHex: "#59624b", images: ["https://i.pinimg.com/1200x/d2/ef/b4/d2efb4b92afcb508a6da562bc3511f82.jpg"] }],
  },
];




export const categories: SeedCategory[] = [
   {
    id: "cat-shirts",
    slug: "shirts",
    name: "Shirts",
    image: "https://i.pinimg.com/736x/61/64/b0/6164b0e49f42c29fbe66331b4b34297a.jpg",
  },

  {
    id: "cat-denim",
    slug: "denim",
    name: "Denim",
    image: "https://i.pinimg.com/736x/6e/e3/81/6ee3812aa28330014353cf146e3cc8fd.jpg",
  },
    {
    id: "cat-layering",
    slug: "layering",
    name: "Layering",
    image: "https://i.pinimg.com/736x/0d/3d/9e/0d3d9ee6a1826ade69aca0543dbcf092.jpg",
  },
  {
    id: "cat-essentials",
    slug: "essentials",
    name: "Essentials",
    image: "https://i.pinimg.com/1200x/6c/5d/aa/6c5daa0c9c0912a63c3c4f63e2b78f94.jpg",
  },
   {
    id: "cat-knitwear",
    slug: "knitwear",
    name: "Knitwear",
    image: "https://i.pinimg.com/736x/72/34/df/7234df3e9610d471e626a778191e7a05.jpg",
  },
 
  {
    id: "cat-bottoms",
    slug: "bottoms",
    name: "Bottoms",
    image: "https://i.pinimg.com/736x/3d/6f/b8/3d6fb8c267294de163a85214321b2206.jpg",
  },
  {
    id: "cat-core",
    slug: "core",
    name: "Core",
    image: "https://i.pinimg.com/736x/39/23/0e/39230ec1522182b1cfa888d19eaa5509.jpg",
  },
   {
     id: "cat-outerwear",
     slug: "outerwear",
     name: "Outerwear",
     image: "https://i.pinimg.com/1200x/26/5a/7a/265a7add90f5682fc56ad7ccb656fd01.jpg",
   },
];

export const sizes = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
];

const toSkuPart = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");

const getRandomInitialStock = (): number =>
  Math.floor(Math.random() * (MAX_INITIAL_STOCK - MIN_INITIAL_STOCK + 1)) +
  MIN_INITIAL_STOCK;

async function seed(): Promise<void> {
  try {
    const categorySlugs = new Set(categories.map((category) => category.slug));
    const missingCategories = new Set(
      products
        .map((product) => product.categorySlug)
        .filter((categorySlug) => !categorySlugs.has(categorySlug)),
    );
    if (missingCategories.size > 0) {
      throw new Error(`Missing category seed data for: ${[...missingCategories].join(", ")}.`);
    }

    const missingSizes = new Set(
      products.flatMap((product) => product.sizes).filter((size) => !sizes.includes(size)),
    );
    if (missingSizes.size > 0) {
      throw new Error(`Missing size seed data for: ${[...missingSizes].join(", ")}.`);
    }

    const categoryIds = new Map<string, string>();
    for (const [displayOrder, category] of categories.entries()) {
      const savedCategory = await prisma.category.upsert({
        where: { slug: category.slug },
        create: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          image: category.image,
          displayOrder,
        },
        update: {
          name: category.name,
          image: category.image,
          displayOrder,
        },
      });

      categoryIds.set(category.slug, savedCategory.id);
    }

    const sizeIds = new Map<string, string>();
    for (const size of sizes) {
      const savedSize = await prisma.size.upsert({
        where: { size },
        create: { size },
        update: {},
      });
      sizeIds.set(size, savedSize.id);
    }

    for (const product of products) {
      const categoryId = categoryIds.get(product.categorySlug);
      if (!categoryId) {
        throw new Error(`No seeded category found for product "${product.name}".`);
      }

      await prisma.product.upsert({
        where: { id: product.id },
        create: {
          id: product.id,
          name: product.name,
          description: product.description,
          categoryId,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
        },
        update: {
          name: product.name,
          description: product.description,
          categoryId,
          sellingPrice: product.sellingPrice,
        },
      });

      for (const color of product.colors) {
        const savedColor = await prisma.productColor.upsert({
          where: {
            productId_colorName: {
              productId: product.id,
              colorName: color.colorName,
            },
          },
          create: {
            productId: product.id,
            colorName: color.colorName,
            colorHex: color.colorHex,
            images: color.images,
          },
          update: {
            colorHex: color.colorHex,
            images: color.images,
          },
        });

        for (const size of product.sizes) {
          const sizeId = sizeIds.get(size);
          if (!sizeId) {
            throw new Error(`Size "${size}" was not created.`);
          }

          const sku = [
            product.id,
            toSkuPart(color.colorName),
            toSkuPart(size),
          ]
            .filter(Boolean)
            .join("-");
          const stockQty = getRandomInitialStock();

          await prisma.productVariant.upsert({
            where: {
              productColorId_sizeId: {
                productColorId: savedColor.id,
                sizeId,
              },
            },
            create: {
              productColorId: savedColor.id,
              sizeId,
              sku,
              stockQty,
              stockMovements: {
                create: {
                  type: StockMovementType.PURCHASE_IN,
                  quantity: stockQty,
                  reason: "Initial stock from seed",
                },
              },
            },
            update: {},
          });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    await prisma.user.upsert({
      where: { email: superAdminEmail },
      create: {
        name: "Super Admin",
        email: superAdminEmail,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
      },
      update: {
        name: "Super Admin",
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        status: "ACTIVE",
      },
    });

    console.info(
      `Seeded ${categories.length} categories, ${sizes.length} sizes, ${products.length} products, and super admin ${superAdminEmail}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
});

