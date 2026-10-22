export interface DeliveryAreaInfo {
  name: string;
  timeMins: number;
  distanceKm?: number;
}

export const DELIVERY_AREAS: DeliveryAreaInfo[] = [
  { name: 'LB Nagar Ring Road', timeMins: 15, distanceKm: 2.1 },
  { name: 'Chinthalkunta Hub', timeMins: 12, distanceKm: 1.2 },
  { name: 'Vanasthalipuram', timeMins: 18, distanceKm: 3.5 },
  { name: 'Kothapet Fruit Market', timeMins: 20, distanceKm: 4.2 },
  { name: 'Dilsukhnagar Main', timeMins: 22, distanceKm: 5.1 },
  { name: 'Nagole Junction', timeMins: 22, distanceKm: 5.4 },
  { name: 'Karmanghat Temple', timeMins: 20, distanceKm: 4.0 },
  { name: 'Uppal Ring Road', timeMins: 25, distanceKm: 6.8 },
  { name: 'Hayathnagar Highway', timeMins: 25, distanceKm: 7.2 },
  { name: 'Mansoorabad Colony', timeMins: 18, distanceKm: 3.8 },
  { name: 'Saroornagar Lake', timeMins: 22, distanceKm: 4.8 },
  { name: 'Malakpet Gunj', timeMins: 28, distanceKm: 7.5 }
];
