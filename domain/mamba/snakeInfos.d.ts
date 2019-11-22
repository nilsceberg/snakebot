export interface Coordinate {
	x: number,
	y: number,
}

export type Position = number

export interface SnakeInfo {
	getName(): string;
	getPoints(): number;
	getPositions(): Position[];
	getId(): string;
	isAlive(): boolean;
}
