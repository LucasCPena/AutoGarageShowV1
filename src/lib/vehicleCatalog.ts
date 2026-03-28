export const vehicleCatalog: Record<string, string[]> = {
  Chevrolet: ["Opala", "Chevette", "Monza", "Caravan"],
  Ford: ["Maverick", "Corcel", "Galaxie", "F-100"],
  Volkswagen: ["Fusca", "Kombi", "Brasília", "Gol"],
  Fiat: ["147", "Uno", "Spazio", "Oggi"],
  Porsche: ["911", "356"],
  Mercedes: ["W123", "W124"],
  BMW: ["2002", "E21", "E30"]
};

export const vehicleMakes = Object.keys(vehicleCatalog).sort((a, b) =>
  a.localeCompare(b)
);

export const motorcycleCatalog: Record<string, string[]> = {
  Honda: ["CG 125", "CB 400", "CB 450", "CBX 750", "Shadow 600", "XLX 350"],
  Yamaha: ["DT 180", "RD 350", "XT 600", "Virago 535", "RX 125", "XTZ 250"],
  Suzuki: ["Intruder 125", "GS 500", "Bandit 600", "Yes 125", "DR 800"],
  Kawasaki: ["Ninja 250", "Ninja 750", "Z 750", "KZ 1000", "Vulcan 500"],
  BMW: ["R 80", "R 100", "K 100", "F 650", "R 1150 GS"],
  "Harley-Davidson": ["Sportster 883", "Fat Boy", "Heritage", "Dyna", "Softail"]
};

export const motorcycleMakes = Object.keys(motorcycleCatalog).sort((a, b) =>
  a.localeCompare(b)
);

export function getModelsForMake(make: string) {
  return vehicleCatalog[make] ?? [];
}

export function getMotorcycleModelsForMake(make: string) {
  return motorcycleCatalog[make] ?? [];
}
