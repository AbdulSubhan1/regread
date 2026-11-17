// The makes most often seen on Gulf and Pakistani roads. A make outside this list is kept but marked "check".
const MAKES = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "BYD",
  "Cadillac",
  "Changan",
  "Chery",
  "Chevrolet",
  "Chrysler",
  "Citroen",
  "Dodge",
  "DFSK",
  "Ferrari",
  "Fiat",
  "Ford",
  "Geely",
  "Genesis",
  "GMC",
  "Haval",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Isuzu",
  "Jaguar",
  "Jeep",
  "JAC",
  "Jetour",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "Mercedes-Benz",
  "MG",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Peugeot",
  "Porsche",
  "Proton",
  "Renault",
  "Rolls-Royce",
  "Skoda",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
  "Daihatsu",
  "Prince",
  "United",
  "Hino",
  "Foton",
  "GAC",
];

const ALIASES: Record<string, string> = {
  MERCEDES: "Mercedes-Benz",
  BENZ: "Mercedes-Benz",
  VW: "Volkswagen",
  CHEVY: "Chevrolet",
  ROLLSROYCE: "Rolls-Royce",
  LANDROVER: "Land Rover",
  RANGEROVER: "Land Rover",
};

const key = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const BY_KEY = new Map<string, string>([
  ...MAKES.map((m): [string, string] => [key(m), m]),
  ...Object.entries(ALIASES),
]);

const titleCase = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

export function canonicalMake(raw: string): { value: string; known: boolean } {
  const known = BY_KEY.get(key(raw));
  return known ? { value: known, known: true } : { value: titleCase(raw), known: false };
}
