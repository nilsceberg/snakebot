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
	translatePosition
} from "../domain/mapUtils";

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

function onMapUpdated(mapState: MapState, myUserId: string): Decision {
	const map = mapState.getMap();
	let direction: Direction = "DOWN";

	const snakeBrainDump: any = {
	};

	// 1. Where's what etc.
	const myCoords = getSnakePosition(myUserId, map);
	log('I am here:', myCoords);
	snakeBrainDump.myCoords = myCoords;

	// 2. Do some nifty planning...
	direction = search(myUserId, map, myCoords, 0);

	log(`Moving: ${direction}`);

	// 3. Then shake that snake!
	return {
		direction,
		debugData: snakeBrainDump
	};
}

const SEARCH_DEPTH = 5;
const DFS_MAX = 80;

class DeathTag implements Tag {
	getScore() {
		return -99999;
	}
}

class RandomTag implements Tag {
	getScore() {
		return Math.round(Math.random() * 2 - 1);
	}
}

class RoomSizeTag implements Tag {
	private size: number;

	constructor(size: number) {
		this.size = size;
	}

	getScore() {
		return this.size * 1;
	}
}

class PossibleCollisionTag implements Tag {
	getScore() {
		return -50;
	}
}

function score(tags: Tag[]): number {
	return tags.reduce((a, b) => a + b.getScore(), 0);
}

const flatten = <T>(acc: T[], curr: T[]) => acc.concat(curr);

const possibleCollisionTagger = (map: GameMap, myId: string) => tagger(map,
	(map, move) => 
		[map.getSnakeInfos()
		.filter(s => s.getId() !== myId)
		.map(s => getSnakePosition(s.getId(), map))
		.map(c => getNeighbors(c))
		.reduce(flatten, [])
		.map(c => translateCoordinate(c, map.getWidth()))
		.includes(translateCoordinate(move, map.getWidth())), null],
	() => new PossibleCollisionTag
);

function search(myId: string, map: GameMap, coord: Coordinate, depth: number): Direction {
	const neighbors = getNeighbors(coord)
		.map(x => tag(x, !isTileAvailableForMovementTo(x, map) ? new DeathTag : null))
		.map(x => tag(x, new RandomTag))
		.map(x => tag(x, new RoomSizeTag(dfs(map, x, {}, 0))))
		.map(possibleCollisionTagger(map, myId))
		.sort((a, b) => score(b.tags) - score(a.tags));
	log(neighbors);

	return neighbors[0].direction;
}

function dfs(map: GameMap, coord: Coordinate, visited: { [pos: number]: boolean }, depth: number): number {
	const isTileAvailable = (c: Coordinate) =>
		isTileAvailableForMovementTo(c, map)
		&& !visited[translateCoordinate(c, map.getWidth())];
	
	const pos = translateCoordinate(coord, map.getWidth());
	const dead = !isTileAvailable(coord);
	const bottom = depth === DFS_MAX;

	if (dead || bottom) {
		return depth;
	}

	visited[pos] = true;
	const neighbors = getNeighbors(coord);
	return Math.max(
		0, ...neighbors.map(c => dfs(map, c, visited, depth + 1))
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


