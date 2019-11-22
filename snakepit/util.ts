import { GameMap } from "../domain/mamba/gameMap";
import { Direction, Coordinate } from "../domain/mapUtils";

export interface MapState {
	getMap(): GameMap;
}

export interface Tag {
	getScore(): number;
}

export interface Move extends Coordinate {
	direction: Direction;
	tags: Tag[];
}

export function tag(move: Move, tag: Tag): Move {
	if (!tag) return move;
	return {
		...move,
		tags: [...move.tags, tag],
	};
}

export function tagger<T = void>(map: GameMap, condition: (map: GameMap, move: Move) => [boolean, T], tagFactory: (data: T) => Tag): (move: Move) => Move {
	return (move: Move) => {
		const [shouldTag, data] = condition(map, move);
		if (shouldTag) {
			return tag(move, tagFactory(data));
		}
		else {
			return move;
		}
	};
}

export const movementDeltas: Move[] = [
	{ direction: "UP", x: 0, y: -1, tags: [] },
	{ direction: "RIGHT", x: 1, y: 0, tags: [] },
	{ direction: "DOWN", x: 0, y: 1, tags: [] },
	{ direction: "LEFT", x: -1, y: 0, tags: [] },
];

export const directions: Direction[] = [
	"UP", "RIGHT", "DOWN", "LEFT"
];

export const directionDeltas: { [dir: string]: Coordinate } = {
	UP: { x: 0, y: -1 },
	RIGHT: { x: 1, y: 0 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
};

export const opposite: { [dir: string]: Direction } = {
	UP: "DOWN",
	RIGHT: "LEFT",
	DOWN: "UP",
	LEFT: "RIGHT",
};

export interface Decision {
	direction: Direction;
	debugData: any;
};
