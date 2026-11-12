
import prisma from "../prisma.js";

const nutrients = [
  { key: "vitamin_a", name: "Vitamin A", unit: "mcg", category: "VITAMIN", dailyTarget: 900 },
  { key: "vitamin_c", name: "Vitamin C", unit: "mg", category: "VITAMIN", dailyTarget: 90 },
  { key: "vitamin_d", name: "Vitamin D", unit: "mcg", category: "VITAMIN", dailyTarget: 15 },
  { key: "vitamin_e", name: "Vitamin E", unit: "mg", category: "VITAMIN", dailyTarget: 15 },
  { key: "vitamin_k", name: "Vitamin K", unit: "mcg", category: "VITAMIN", dailyTarget: 110 },

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


const biomarkers = [
  // BODY COMPOSITION
  {
    key: "body_fat",
    name: "Body Fat",
    category: "BODY_COMPOSITION",
    defaultUnit: "%",
    description: "Percentage of total body weight that is fat.",
  },
  {
    key: "waist",
    name: "Waist Circumference",
    category: "BODY_COMPOSITION",
    defaultUnit: "cm",
    description: "Circumference measured around the waist.",
  },
  {
    key: "skeletal_muscle_mass",
    name: "Skeletal Muscle Mass",
    category: "BODY_COMPOSITION",
    defaultUnit: "kg",
    description: "Estimated mass of skeletal muscle.",
  },
  {
    key: "lean_body_mass",
    name: "Lean Body Mass",
    category: "BODY_COMPOSITION",
    defaultUnit: "kg",
    description: "Body weight excluding fat mass.",
  },
  {
    key: "visceral_fat",
    name: "Visceral Fat",
    category: "BODY_COMPOSITION",
    defaultUnit: null,
    description: "Visceral fat estimate. Unit depends on measurement method.",
  },

  // CARDIOVASCULAR & FITNESS
  {
    key: "vo2_max",
    name: "VO2 Max",
    category: "CARDIOVASCULAR_FITNESS",
    defaultUnit: "mL/kg/min",
    description: "Maximum rate of oxygen consumption during exercise.",
  },
  {
    key: "resting_heart_rate",
    name: "Resting Heart Rate",
    category: "CARDIOVASCULAR_FITNESS",
    defaultUnit: "bpm",
    description: "Heart rate measured at rest.",
  },
  {
    key: "systolic_blood_pressure",
    name: "Systolic Blood Pressure",
    category: "CARDIOVASCULAR_FITNESS",
    defaultUnit: "mmHg",
    description: "Systolic blood pressure measurement.",
  },
  {
    key: "diastolic_blood_pressure",
    name: "Diastolic Blood Pressure",
    category: "CARDIOVASCULAR_FITNESS",
    defaultUnit: "mmHg",
    description: "Diastolic blood pressure measurement.",
  },
  {
    key: "grip_strength",
    name: "Grip Strength",
    category: "CARDIOVASCULAR_FITNESS",
    defaultUnit: "kg",
    description: "Maximum measured hand grip force.",
  },

  // METABOLIC
  {
    key: "hba1c",
    name: "HbA1c",
    category: "METABOLIC",
    defaultUnit: "%",
    description: "Glycated hemoglobin.",
  },
  {
    key: "fasting_glucose",
    name: "Fasting Glucose",
    category: "METABOLIC",
    defaultUnit: "mg/dL",
    description: "Blood glucose measured after fasting.",
  },
  {
    key: "fasting_insulin",
    name: "Fasting Insulin",
    category: "METABOLIC",
    defaultUnit: "µIU/mL",
    description: "Insulin concentration measured after fasting.",
  },
  {
    key: "estimated_average_glucose",
    name: "Estimated Average Glucose",
    category: "METABOLIC",
    defaultUnit: "mg/dL",
    description: "Estimated average blood glucose derived from HbA1c.",
  },

  // LIPID
  {
    key: "total_cholesterol",
    name: "Total Cholesterol",
    category: "LIPID",
    defaultUnit: "mg/dL",
    description: "Total cholesterol concentration.",
  },
  {
    key: "ldl",
    name: "LDL Cholesterol",
    category: "LIPID",
    defaultUnit: "mg/dL",
    description: "Low-density lipoprotein cholesterol.",
  },
  {
    key: "hdl",
    name: "HDL Cholesterol",
    category: "LIPID",
    defaultUnit: "mg/dL",
    description: "High-density lipoprotein cholesterol.",
  },
  {
    key: "triglycerides",
    name: "Triglycerides",
    category: "LIPID",
    defaultUnit: "mg/dL",
    description: "Triglyceride concentration in blood.",
  },
  {
    key: "non_hdl_cholesterol",
    name: "Non-HDL Cholesterol",
    category: "LIPID",
    defaultUnit: "mg/dL",
    description: "Total cholesterol minus HDL cholesterol.",
  },
  {
    key: "apob",
    name: "Apolipoprotein B (ApoB)",
    category: "LIPID",
    defaultUnit: "mg/dL",
    description: "Apolipoprotein B concentration.",
  },
  {
    key: "lp_a",
    name: "Lipoprotein(a)",
    category: "LIPID",
    defaultUnit: "nmol/L",
    description: "Lipoprotein(a) concentration.",
  },

  // LIVER
  {
    key: "alt",
    name: "ALT",
    category: "LIVER",
    defaultUnit: "U/L",
    description: "Alanine aminotransferase.",
  },
  {
    key: "ast",
    name: "AST",
    category: "LIVER",
    defaultUnit: "U/L",
    description: "Aspartate aminotransferase.",
  },
  {
    key: "ggt",
    name: "GGT",
    category: "LIVER",
    defaultUnit: "U/L",
    description: "Gamma-glutamyl transferase.",
  },
  {
    key: "alp",
    name: "Alkaline Phosphatase",
    category: "LIVER",
    defaultUnit: "U/L",
    description: "Alkaline phosphatase enzyme concentration.",
  },
  {
    key: "bilirubin",
    name: "Total Bilirubin",
    category: "LIVER",
    defaultUnit: "mg/dL",
    description: "Total bilirubin concentration.",
  },
  {
    key: "albumin",
    name: "Albumin",
    category: "LIVER",
    defaultUnit: "g/dL",
    description: "Serum albumin concentration.",
  },

  // KIDNEY
  {
    key: "creatinine",
    name: "Creatinine",
    category: "KIDNEY",
    defaultUnit: "mg/dL",
    description: "Serum creatinine concentration.",
  },
  {
    key: "egfr",
    name: "eGFR",
    category: "KIDNEY",
    defaultUnit: "mL/min/1.73m²",
    description: "Estimated glomerular filtration rate.",
  },
  {
    key: "urea",
    name: "Urea",
    category: "KIDNEY",
    defaultUnit: "mg/dL",
    description: "Blood urea concentration.",
  },
  {
    key: "uric_acid",
    name: "Uric Acid",
    category: "KIDNEY",
    defaultUnit: "mg/dL",
    description: "Serum uric acid concentration.",
  },

  // BLOOD
  {
    key: "hemoglobin",
    name: "Hemoglobin",
    category: "BLOOD",
    defaultUnit: "g/dL",
    description: "Hemoglobin concentration.",
  },
  {
    key: "rbc",
    name: "Red Blood Cell Count",
    category: "BLOOD",
    defaultUnit: "million/µL",
    description: "Red blood cell count.",
  },
  {
    key: "hematocrit",
    name: "Hematocrit",
    category: "BLOOD",
    defaultUnit: "%",
    description: "Percentage of blood volume occupied by red blood cells.",
  },
  {
    key: "wbc",
    name: "White Blood Cell Count",
    category: "BLOOD",
    defaultUnit: "cells/µL",
    description: "White blood cell count.",
  },
  {
    key: "platelets",
    name: "Platelet Count",
    category: "BLOOD",
    defaultUnit: "10^3/µL",
    description: "Platelet count.",
  },
  {
    key: "mcv",
    name: "MCV",
    category: "BLOOD",
    defaultUnit: "fL",
    description: "Mean corpuscular volume.",
  },
  {
    key: "mch",
    name: "MCH",
    category: "BLOOD",
    defaultUnit: "pg",
    description: "Mean corpuscular hemoglobin.",
  },
  {
    key: "mchc",
    name: "MCHC",
    category: "BLOOD",
    defaultUnit: "g/dL",
    description: "Mean corpuscular hemoglobin concentration.",
  },
  {
    key: "rdw",
    name: "RDW",
    category: "BLOOD",
    defaultUnit: "%",
    description: "Red cell distribution width.",
  },

  // HORMONE & NUTRITION
  {
    key: "tsh",
    name: "TSH",
    category: "HORMONE_NUTRITION",
    defaultUnit: "µIU/mL",
    description: "Thyroid-stimulating hormone.",
  },
  {
    key: "free_t3",
    name: "Free T3",
    category: "HORMONE_NUTRITION",
    defaultUnit: "pg/mL",
    description: "Free triiodothyronine.",
  },
  {
    key: "free_t4",
    name: "Free T4",
    category: "HORMONE_NUTRITION",
    defaultUnit: "ng/dL",
    description: "Free thyroxine.",
  },
  {
    key: "vitamin_d",
    name: "Vitamin D",
    category: "HORMONE_NUTRITION",
    defaultUnit: "ng/mL",
    description: "25-hydroxy vitamin D.",
  },
  {
    key: "vitamin_b12",
    name: "Vitamin B12",
    category: "HORMONE_NUTRITION",
    defaultUnit: "pg/mL",
    description: "Vitamin B12 concentration.",
  },
  {
    key: "ferritin",
    name: "Ferritin",
    category: "HORMONE_NUTRITION",
    defaultUnit: "ng/mL",
    description: "Serum ferritin concentration.",
  },
  {
    key: "hs_crp",
    name: "hs-CRP",
    category: "HORMONE_NUTRITION",
    defaultUnit: "mg/L",
    description: "High-sensitivity C-reactive protein.",
  },
] as const;


async function seedBiomarkers() {
  for (const biomarker of biomarkers) {
    await prisma.biomarker.upsert({
      where: { key: biomarker.key },
      update: {
        name: biomarker.name,
        category: biomarker.category,
        defaultUnit: biomarker.defaultUnit,
        description: biomarker.description,
      },
      create: biomarker,
    });
  }

  console.log(`Seeded ${biomarkers.length} biomarkers.`);
}



async function seedNutrients() {
  for (const nutrient of nutrients) {
    const { key, ...data } = nutrient;

    await prisma.nutrient.upsert({
      where: { key },
      update: data,
      create: nutrient,
    });
  }

  console.log(`Seeded ${nutrients.length} nutrients.`);
}


async function main() {
  await seedNutrients();
  await seedBiomarkers();

  console.log("All seed operations completed successfully.");
}



main()
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });