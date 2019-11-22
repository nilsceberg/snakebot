/**
 * Faroquorv:
 * A vegetarian alternative to the infamous farokorv.
 * 
 * Author: Lemony Ginger
 */
import {
	Direction,
	getSnakePosition,
	Coordinate,
	isTileAvailableForMovementTo,
	translateCoordinate,
	translateCoordinates,
	translatePosition,
	Tile,
	getOccupiedMapTiles,
	OccupiedMap
} from "../snakepit/myMapUtils";

import * as util from "util";

import {
	MapState,
	Decision,
	movementDeltas,
	directionDeltas,
	directions,
	Move,
	tag,
	Tag,
	opposite,
	tagger
} from "./util";

import { GameMap } from "../domain/mamba/gameMap";

let log = null; // Injected logger

interface RuleResult {
	apply: boolean;
	direction: Direction;
}

let precomputed: OccupiedMap;

function onMapUpdated(mapState: MapState, myUserId: string): Decision {
	const map = mapState.getMap();
	let direction: Direction = "DOWN";

	const snakeBrainDump: any = {
	};

	precomputed = getOccupiedMapTiles(map);

	// 1. Where's what etc.
	const myCoords = getSnakePosition(myUserId, map);
	log('I am here:', myCoords);
	snakeBrainDump.myCoords = myCoords;

	log(map.getWorldTick());
	// 2. Do some nifty planning...
	const neighbors = search(myUserId, map, myCoords, 0)
		.sort((a, b) => score(b.tags) - score(a.tags));
	log(util.inspect(neighbors, { colors: true, depth: null }));

	snakeBrainDump.neighbors = neighbors;

	direction = neighbors[0].direction;

	log(`Moving: ${direction}`);

	// 3. Then shake that snake!
	return {
		direction,
		debugData: snakeBrainDump,
	};
}

const SEARCH_DEPTH = 1;
const DFS_MAX = 200;

class DeathTag implements Tag {
	getScore() {
		return -99999;
	}

	toString() {
		return `${this.constructor.name}:${this.getScore()}`;
	}
}

class RandomTag implements Tag {
	getScore() {
		return Math.random() * 2 - 1;
	}

	toString() {
		return `${this.constructor.name}:${this.getScore()}`;
	}
}

class RoomSizeTag implements Tag {
	private size: number;

	constructor(size: number) {
		this.size = size;
	}

	getScore() {
		if (this.size < 50) {
			return -100;
		}
		return this.size * 1;
	}

	toString() {
		return `${this.constructor.name}:${this.getScore()}`;
	}
}

class PossibleCollisionTag implements Tag {
	getScore() {
		return -50;
	}

	toString() {
		return `${this.constructor.name}:${this.getScore()}`;
	}
}

class FutureTag implements Tag {
	private neighborScores: number;

	constructor(neighborScores: number) {
		this.neighborScores = neighborScores;
	}

	getScore() {
		return this.neighborScores * 0.1;
	}

	toString() {
		return `${this.constructor.name}:${this.getScore()}`;
	}
}

class CanTrapTag implements Tag {
	getScore() {
		return 2000;
	}

	toString() {
		return `${this.constructor.name}:${this.getScore()}`;
	}
}

const flatten = <T>(acc: T[], curr: T[]) => acc.concat(curr);
const sum = (a: number, b: number) => a + b;

function score(tags: Tag[]): number {
	return tags.reduce((a, b) => a + b.getScore(), 0);
}

const possibleCollisionTagger = (map: GameMap, myId: string, nextHeads: { [pos: number]: boolean }) => tagger(map,
	(map, move) => [translateCoordinate(move, map.getWidth()) in nextHeads, null],
	() => new PossibleCollisionTag
);

const canTrapTagger = (map: GameMap, myId: string) => tagger(
	map,
	(map, move) => {
		if (!isTileAvailableForMovementTo(move, map, precomputed)) return [false, null];

		let distanceTraveled = 0;
		let coord: Coordinate = move;
		const visited: { [pos: number]: boolean } = {};
		while (true) {
			const next = applyMovement(coord, move.direction);
			if (!isTileAvailableForMovementTo(coord, map, precomputed)) {
				break;
			}
			else {
				coord = next;
				visited[translateCoordinate(coord, map.getWidth())] = true;
				distanceTraveled++;
			}
		}

		for (const info of map.getSnakeInfos()) {
			if (info.getId() === myId || !info.isAlive()) break;
			const snakeHead = getSnakePosition(info.getId(), map);
			const maxBefore = Math.max(0, ...getNeighbors(snakeHead).map(
				x => dfs(map, x, {}, 0, 80)
			));
			const maxAfter = Math.max(0, ...getNeighbors(snakeHead).map(
				x => dfs(map, x, Object.assign({}, visited), 0, 80)
			));
			log(`${info.getName()}/${info.getId()}, ${maxBefore} - ${maxAfter}`);

			if (maxBefore - maxAfter > distanceTraveled) {
				return [true, null];
			}
		};

		return [false, null];
	},
	() => new CanTrapTag
);

function nextPotentialHeadPositions(map: GameMap, myId: string) {
	const positions: { [pos: number]: boolean } = {};
	map.getSnakeInfos()
	.filter(s => s.getId() !== myId && s.isAlive())
	.map(s => getSnakePosition(s.getId(), map))
	.map(c => getNeighbors(c))
	.reduce(flatten, [])
	.map(c => translateCoordinate(c, map.getWidth()))
	.forEach(p => positions[p] = true);
	return positions;
}

function search(myId: string, map: GameMap, coord: Coordinate, depth: number): Move[] {
	const nextHeads = nextPotentialHeadPositions(map, myId);

	let neighbors = getNeighbors(coord)
		.map(x => tag(x, !isTileAvailableForMovementTo(x, map, precomputed) ? new DeathTag : null))
		.map(x => tag(x, new RandomTag))
		.map(x => tag(x, new RoomSizeTag(dfs(map, x, {}, 0, DFS_MAX))))
		.map(canTrapTagger(map, myId))
		.map(possibleCollisionTagger(map, myId, nextHeads))

	//if (depth !== SEARCH_DEPTH) {
	//	neighbors = neighbors.map(x => tag(x, new FutureTag(
	//		search(myId, map, x, depth + 1).map(x => score(x.tags)).reduce(sum, 0)
	//	)));
	//}

	return neighbors;
}

let dfsKillSwitch = false;
function dfs(map: GameMap, coord: Coordinate, visited: { [pos: number]: boolean }, depth: number, maxDepth: number): number {
	if (depth === 0) {
		dfsKillSwitch = false;
	}

	const isTileAvailable = (c: Coordinate) =>
		isTileAvailableForMovementTo(c, map, precomputed)
		&& !visited[translateCoordinate(c, map.getWidth())];
	
	const pos = translateCoordinate(coord, map.getWidth());
	const dead = !isTileAvailable(coord);
	const bottom = depth === maxDepth;
	
	dfsKillSwitch = dfsKillSwitch || bottom;

	if (dead || bottom || dfsKillSwitch) {
		return depth;
	}

	visited[pos] = true;
	const neighbors = getNeighbors(coord);
	return Math.max(
		0, ...neighbors.map(c => dfs(map, c, visited, depth + 1, maxDepth))
	);
}

function getNeighbors(coord: Coordinate): Move[] {
	return directions.map(d => ({ tags: [], direction: d, ...applyMovement(coord, d) }));
}

function applyMovement(coord: Coordinate, direction: Direction): Coordinate {
	return add(coord, directionDeltas[direction]);
}

function add(a: Coordinate, b: Coordinate): Coordinate {
	return {
		x: a.x + b.x,
		y: a.y + b.y,
	};
}

function bootStrap(logger) {
	log = logger;
}

function onGameEnded(event) {
	log('On Game Ended');
	log(event);
	// Implement as needed.
}

function onTournamentEnded(event) {
	log('On Tournament Ended');
	log(event);
	// Implement as needed.
}

function onSnakeDied(event) {
	log('On Snake Died');
}

function onGameStarted(event) {
	log('On Game Started');
	log(event);
	// Implement as needed.
}

function onGameResult(event) {
	log('On Game Result');
	log(event);
	// Implement as needed.
}

export {
	bootStrap,
	onGameEnded,
	onGameResult,
	onGameStarted,
	onMapUpdated,
	onSnakeDied,
	onTournamentEnded
};


