import { Coordinate, Position, SnakeInfo } from "../domain/mamba/snakeInfos";
import { GameMap } from "../domain/mamba/gameMap";

export type Direction = "UP" | "RIGHT" | "DOWN" | "LEFT";
export type TileContent = "food" | "obstacle" | "snakehead" | "snakebody" | "snaketail" | "outofbounds";

export interface Tile {
	content: TileContent;
}

// number here is really Position
export type TileMap = { [position: number]: Tile };

export interface SnakeHeadCoordinate extends Coordinate {
	alive: boolean;
}

export interface Positionable {
	getX(): number;
	getY(): number;
}

export type SnakeMap = { [id: string]: Coordinate[] };

export type OccupiedMap = { [pos: number]: Tile };

export function getManhattanDistance(startCoord: Coordinate, goalCoord: Coordinate): number;
export function getEuclidianDistance(startCoord: Coordinate, goalCoord: Coordinate): number;
export function translatePosition(position: Position, mapWidth: number): Coordinate;
export function translatePositions(positions: Position[], mapWidth: number): Coordinate[];
export function translateCoordinate(coordinate: Coordinate, mapWidth: number): Position;
export function translateCoordinates(coordinates: Coordinate[], mapWidth: number): Position[];
export function getSnakePosition(playerId: string, map: GameMap): SnakeHeadCoordinate;
export function getSnakeLength(playerId: string, map: GameMap): number;
export function isCoordinateOutOfBounds(coordinate: Coordinate, map: GameMap): boolean;
export function getOccupiedMapTiles(map: GameMap): TileMap;
export function getTileAt(coordinate: Coordinate, map: GameMap, precomputed: OccupiedMap): Tile;
export function positionsToCoords(positions: Position[], mapWidth: number): Coordinate[];
export function sortByClosestTo<T extends Positionable>(items: T[], coordinate: Coordinate): T[];
export function listCoordinatesContainingFood(coordinate: Coordinate, map: GameMap): Coordinate[];
export function listCoordinatesContainingObstacle(coordinate: Coordinate, map: GameMap): Coordinate[];
export function getSnakeCoordinates(playerId: string, map: GameMap): Coordinate[];
export function getSnakesCoordinates(map: GameMap, excludeIds: string[]): SnakeMap;
export function isWithinSquare(coordinate: Coordinate, nwCoordinate: Coordinate, seCoordinate: Coordinate): boolean;
export function isTileAvailableForMovementTo(coordinate: Coordinate, map: GameMap, precomputed: OccupiedMap): boolean;
export function getTileInDirection(direction: Direction, snakeHeadPosition: Coordinate, map: GameMap): Tile;
export function canSnakeMoveInDirection(direction: Direction, snakeHeadPosition: Coordinate, map: GameMap): boolean;

export {
	Coordinate, Position, SnakeInfo
};
