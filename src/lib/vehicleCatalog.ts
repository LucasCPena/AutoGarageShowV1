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

export function getModelsForMake(make: string) {
  return vehicleCatalog[make] ?? [];
}
