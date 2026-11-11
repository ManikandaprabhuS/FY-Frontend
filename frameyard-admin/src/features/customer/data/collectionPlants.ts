import classicPlant from "../../../assets/collection-plant-classic.webp";
import woodenPlant from "../../../assets/collection-plant-wooden.webp";
import premiumPlant from "../../../assets/collection-plant-premium.webp";
export const collectionPlants={
 classic:{src:classicPlant,alt:"Eucalyptus stems in a white ceramic vase beside the classic frame",side:"left"},
 wooden:{src:woodenPlant,alt:"Dried botanical stems in a cream vase beside the wooden frame",side:"left"},
 premium:{src:premiumPlant,alt:"Green leafy stems in a black vase beside the premium frame",side:"right"}
} as const;
