let venueAbbreviationIndex = {
  "ANGLE PARK": "ANPK",
  GAWLER: "GAWL",
  BENDIGO: "BDGO",
  BALLARAT: "BALT",
  HEALESVILLE: "HEAL",
  GEELONG: "GEEL",
  TAREE: "TARE",
  "SANDOWN PARK": "SAND",
  "THE MEADOWS": "MEAD",
  "WENTWORTH PARK": "WPRK",
  GOULBURN: "GOUL",
  BULLI: "BULI",
  NOWRA: "NWRA",
  RICHMOND: "RICH",
  MAITLAND: "MAIT",
  "THE GARDENS": "TGAR",
  // TBC
};

let venueAbbreviationsToVenueNames = () => {
  return Object.fromEntries(
    Object.entries(venueAbbreviationIndex).map(([key, val]) => [val, key]),
  );
};
