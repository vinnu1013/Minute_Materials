export interface DeliveryAreaInfo {
  name: string;
  timeMins: number;
  distanceKm?: number;
}

export const DELIVERY_AREAS: DeliveryAreaInfo[] = [
  { name: 'LB Nagar', timeMins: 12, distanceKm: 1.8 },
  { name: 'Vanasthalipuram', timeMins: 15, distanceKm: 2.8 },
  { name: 'Chinthalkunta', timeMins: 10, distanceKm: 1.0 },
  { name: 'Panama Godown & Sushma', timeMins: 14, distanceKm: 2.4 },
  { name: 'Hastinapuram', timeMins: 15, distanceKm: 3.1 },
  { name: 'BN Reddy Nagar', timeMins: 16, distanceKm: 3.6 },
  { name: 'Mansoorabad', timeMins: 15, distanceKm: 3.0 },
  { name: 'Bairamalguda & Sagar Ring Rd', timeMins: 14, distanceKm: 2.7 },
  { name: 'Karmanghat', timeMins: 16, distanceKm: 3.8 },
  { name: 'Nagole & Alkapuri', timeMins: 18, distanceKm: 4.5 },
  { name: 'Kothapet & Mohan Nagar', timeMins: 18, distanceKm: 4.1 },
  { name: 'Saroornagar', timeMins: 18, distanceKm: 4.2 },
  { name: 'Auto Nagar', timeMins: 16, distanceKm: 3.5 },
  { name: 'Chaitanyapuri & Dilsukhnagar', timeMins: 20, distanceKm: 5.0 },
  { name: 'Hayathnagar & Kuntloor', timeMins: 22, distanceKm: 6.2 },
  { name: 'Meerpet & Badangpet', timeMins: 20, distanceKm: 5.2 },
  { name: 'Champapet', timeMins: 20, distanceKm: 5.3 },
  { name: 'Injapur & Turkayamjal', timeMins: 24, distanceKm: 6.8 }
];
