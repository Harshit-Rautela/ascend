
import prisma from "../prisma.js";

const nutrients = [
  { key: "vitamin_a", name: "Vitamin A", unit: "mcg", category: "VITAMIN", dailyTarget: 900 },
  { key: "vitamin_c", name: "Vitamin C", unit: "mg", category: "VITAMIN", dailyTarget: 90 },
  { key: "vitamin_d", name: "Vitamin D", unit: "mcg", category: "VITAMIN", dailyTarget: 15 },
  { key: "vitamin_e", name: "Vitamin E", unit: "mg", category: "VITAMIN", dailyTarget: 15 },
  { key: "vitamin_k", name: "Vitamin K", unit: "mcg", category: "VITAMIN", dailyTarget: 120 },

  { key: "vitamin_b1", name: "Vitamin B1 (Thiamin)", unit: "mg", category: "VITAMIN", dailyTarget: 1.2 },
  { key: "vitamin_b2", name: "Vitamin B2 (Riboflavin)", unit: "mg", category: "VITAMIN", dailyTarget: 1.3 },
  { key: "vitamin_b3", name: "Vitamin B3 (Niacin)", unit: "mg", category: "VITAMIN", dailyTarget: 16 },
  { key: "vitamin_b5", name: "Vitamin B5 (Pantothenic acid)", unit: "mg", category: "VITAMIN", dailyTarget: 5 },
  { key: "vitamin_b6", name: "Vitamin B6", unit: "mg", category: "VITAMIN", dailyTarget: 1.3 },
  { key: "vitamin_b7", name: "Vitamin B7", unit: "mcg", category: "VITAMIN", dailyTarget: 30 },
  { key: "vitamin_b9", name: "Vitamin B9 (Folate)", unit: "mcg", category: "VITAMIN", dailyTarget: 400 },
  { key: "vitamin_b12", name: "Vitamin B12", unit: "mcg", category: "VITAMIN", dailyTarget: 2.4 },

  { key: "calcium", name: "Calcium", unit: "mg", category: "MINERAL", dailyTarget: 1000 },
  { key: "iron", name: "Iron", unit: "mg", category: "MINERAL", dailyTarget: 8 },
  { key: "magnesium", name: "Magnesium", unit: "mg", category: "MINERAL", dailyTarget: 400 },
  { key: "zinc", name: "Zinc", unit: "mg", category: "MINERAL", dailyTarget: 15 },
  { key: "selenium", name: "Selenium", unit: "mcg", category: "MINERAL", dailyTarget: 55 },
  { key: "potassium", name: "Potassium", unit: "mg", category: "MINERAL", dailyTarget: 3400 },
  { key: "sodium", name: "Sodium", unit: "mg", category: "MINERAL", dailyTarget: 2000 },
  { key: "phosphorus", name: "Phosphorus", unit: "mg", category: "MINERAL", dailyTarget: 700 },
  { key: "iodine", name: "Iodine", unit: "mcg", category: "MINERAL", dailyTarget: 150 },
  { key: "copper", name: "Copper", unit: "mg", category: "MINERAL", dailyTarget: 0.9 },
  { key: "manganese", name: "Manganese", unit: "mg", category: "MINERAL", dailyTarget: 2.3 },

  { key: "choline", name: "Choline", unit: "mg", category: "OTHER", dailyTarget: 550 },
  { key: "fiber", name: "Fiber", unit: "g", category: "OTHER", dailyTarget: 28 },
  { key: "omega_3", name: "Omega-3", unit: "mg", category: "OTHER", dailyTarget: 1600 },
];

async function main() {
  for (const nutrient of nutrients) {
    const { key, ...data } = nutrient;

    await prisma.nutrient.upsert({
      where: { key },
      update: data,
      create: nutrient,
    });
  }

  console.log(`Seeded ${nutrients.length} nutrients with daily targets.`);

  const results = await prisma.nutrient.findMany({
    select: {
      key: true,
      name: true,
      dailyTarget: true,
      unit: true,
    },
    orderBy: { name: "asc" },
  });

  console.table(results);
}

main()
  .catch((error) => {
    console.error("Failed to seed nutrients:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
