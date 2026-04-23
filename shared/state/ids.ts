declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type PlayerId = Brand<string, "PlayerId">;
export type StationId = Brand<string, "StationId">;
export type CrewId = Brand<string, "CrewId">;
export type EnemyId = Brand<string, "EnemyId">;

export const playerId = (s: string) => s as PlayerId;
export const stationId = (s: string) => s as StationId;
export const crewId = (s: string) => s as CrewId;
export const enemyId = (s: string) => s as EnemyId;
