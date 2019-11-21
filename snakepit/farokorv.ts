/**
 * Snake Bot script.
 */
//const MapUtils = //require('../domain/mapUtils.js');
import * as MapUtils from "../domain/mapUtils";
import { Direction as Dir } from "../domain/mapUtils";
import { GameMap } from "../domain/mamba/gameMap";

interface MapState {
	getMap(): GameMap;
}

let log = null; // Injected logger

let us: string = null;
let target = null;

function onMapUpdated(mapState: MapState, myUserId: string) {
	us = myUserId;

	const map = mapState.getMap();
	let direction: MapUtils.Direction = "DOWN";

	const snakeBrainDump: any = {
		target: target,
	}; // Optional debug information about the snakes current state of mind.

	// Make sure we have a target
	selectTarget(myUserId, map);

	// 1. Where's what etc.
	const myCoords = MapUtils.getSnakePosition(myUserId, map);
	log('I am here:', myCoords);
	snakeBrainDump.myCoords = myCoords;

	// 2. Do some nifty planning...
	const targetId = target.getId();
	const targetHead = MapUtils.getSnakePosition(targetId, map);

	// Target a bit in front of 
	const targetHeading = getSnakeHeading(target, map);
	const targetLead = {
		x: targetHead.x + targetHeading.x * 3,
		y: targetHead.y + targetHeading.y * 3,
	};

	const [ ox, oy ] = [
		targetLead.x - myCoords.x,
		targetLead.y - myCoords.y,
	];
	
	if (MapUtils.getEuclidianDistance(myCoords, targetLead) > 4) {
		if (Math.abs(ox) >= Math.abs(oy)) {
			direction = ox > 0 ? "RIGHT" : "LEFT";
		}
		else {
			direction = oy > 0 ? "DOWN" : "UP";
		}
	// When getting close, switch strategy to intercept, maybe?
	} else {
		if (Math.abs(oy) >= Math.abs(ox)) {
			direction = ox > 0 ? "RIGHT" : "LEFT";
		}
		else {
			direction = oy > 0 ? "DOWN" : "UP";
		}
	}
	log(`WANT: ${direction}`);

	//direction = basicAvoidance(myCoords, map, direction);
	//log(`INITIAL AVOID: ${direction}`);

	const beforePersonalSpace = direction;
	direction = ensurePersonalSpace(myUserId, map, direction);
	log(`PERSONAL: ${direction}`);

	// If not changed by higher priority rule
	if (direction === beforePersonalSpace) {
		direction = bestDeadEndDirection(myCoords, map);
	}
	//direction = avoid(direction, d => isDeadEnd(getNewCoords(myCoords, d), map));
	log(`DEAD END: ${direction}`);

	direction = basicAvoidance(myCoords, map, direction);
	log(`MOVING: ${direction}`);

	//log(Object.keys(MapUtils.getOccupiedMapTiles(map).filter())

	// 3. Then shake that snake!
	return {
		direction,
		debugData: snakeBrainDump
	};
}

const movementDeltas = [
	{ direction: "UP", x: 0, y: -1 },
	{ direction: "RIGHT", x: 1, y: 0 },
	{ direction: "DOWN", x: 0, y: 1 },
	{ direction: "LEFT", x: -1, y: 0 },
];

const directions: MapUtils.Direction[] = [
	"UP", "RIGHT", "DOWN", "LEFT"
];

const directionDelta = {
	UP: { x: 0, y: -1 },
	RIGHT: { x: 1, y: 0 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
};

function ensurePersonalSpace(id: string, map: GameMap, direction: MapUtils.Direction) {
	const coords = MapUtils.getSnakeCoordinates(id, map);
	const newCoords = getNewCoords(getNewCoords(coords, direction), direction);

	if (dangerClose(newCoords, map, 2)) {
		const dangerRatings = directions.map(direction => ({
			direction,
			rating: dangerRating(
				getNewCoords(getNewCoords(getNewCoords(coords, direction), direction), direction),
				map,
				3,
			)
		}));
		const leastDangerous = minRating(dangerRatings);
		return leastDangerous.direction;
	}
	else {
		return direction;
	}
}

function isDeadEnd(coords, map) {
	const avoid = dangerousTiles(map);
	return !dfs(coords, map, avoid, {}, 30);
}

function deadEndSize(coords, map) {
	log(`sizing up dead end starting at ${coords.x}, ${coords.y}`);
	const avoid = dangerousTiles(map);
	return dfs2(coords, map, avoid, {}, 50, 0);
}

function bestDeadEndDirection(coords, map): Dir {
	const sorted = directions
		.map(d => ({ direction: d, coords: getNewCoords(coords, d) }))
		.map(c => ({ direction: c.direction, size: deadEndSize(c.coords, map) }))
		.sort((a, b) => b.size - a.size);

	log(sorted);
		
	return sorted[0].direction;
}

function shouldAvoid(coords, map, avoid) {
	return (MapUtils.translateCoordinate(coords, map.getWidth()) in avoid)
		|| MapUtils.isCoordinateOutOfBounds(coords, map);
}

function dfs(coords, map, avoid, visited, depth) {
	if (depth === 0) {
		log(visited);
		return true;
	}
	else {
		if (shouldAvoid(coords, map, avoid)) return false;

		visited[MapUtils.translateCoordinate(coords, map.getWidth())] = true;
		const next = neighbours(coords, map)
			.filter(pos => !(pos in visited))
			.filter(pos => !(pos in avoid))
			.map(pos => MapUtils.translatePosition(pos, map.getWidth()));

		for (let tile of next) {
			if (dfs(tile, map, avoid, visited, depth - 1)) {
				return true;
			}
		}

		return false;
	}
}

function dfs2(coords, map, avoid, visited, depth, potential) {
	if (depth === 0) {
		return potential;
	}
	else {
		if (shouldAvoid(coords, map, avoid)) return potential;

		visited[MapUtils.translateCoordinate(coords, map.getWidth())] = true;
		const next = neighbours(coords, map)
			.filter(pos => !(pos in visited))
			.filter(pos => !(pos in avoid))
			.map(pos => MapUtils.translatePosition(pos, map.getWidth()));

		let max = 0;
		for (let tile of next) {
			const p = dfs2(tile, map, avoid, visited, depth - 1, potential + 1);
			if (p > max) {
				max = p;
			}
		}

		return max;
	}
}

function neighbours(coords, map) {
	return directions
		.map(d => directionDelta[d])
		.map(delta => ({ x: coords.x + delta.x, y: coords.y + delta.y }))
		.filter(coord => !MapUtils.isCoordinateOutOfBounds(coord, map))
		.map(coord => MapUtils.translateCoordinate(coord, map.getWidth()));
}

function posKeys(tiles: MapUtils.TileMap): MapUtils.Position[] {
	const positions = <MapUtils.Position[]><any>Object.keys(tiles);
	return positions;
}

function dangerClose(coords, map, radius) {
	return posKeys(dangerousTiles(map)).filter((pos: MapUtils.Position) => {
		const tileCoords = MapUtils.translatePosition(pos, map.getWidth());
		return MapUtils.getManhattanDistance(coords, tileCoords) <= radius;
	}).length > 0 || partOfSquareOutsideMap(coords, radius, map) > 0;
}

function dangerRating(coords, map, radius) {
	const tiles = MapUtils.getOccupiedMapTiles(map);
	let rating = 0;
	posKeys(tiles).filter(pos => {
		const tileCoords = MapUtils.translatePosition(pos, map.getWidth());
		return MapUtils.getManhattanDistance(coords, tileCoords) <= radius;
	}).forEach(pos => {
		const tile = tiles[pos];
		if (tile.content !== "food") {
			rating++;
		}
	});

	rating += partOfSquareOutsideMap(coords, radius, map);

	return rating;
}

function dangerousTiles(map) {
	const tiles = MapUtils.getOccupiedMapTiles(map);
	for (const pos in tiles) {
		if (tiles[pos].content === "food") {
			delete tiles[pos];
		}
	}
	return tiles;
}

function partOfSquareOutsideMap(coords, radius, map) {
	let part = 0;
	for (let x = coords.x - radius; x <= coords.x + radius; ++x) {
		for (let y = coords.y - radius; y <= coords.y + radius; ++y) {
			if (MapUtils.isCoordinateOutOfBounds({ x, y }, map)) {
				part++;
			}
		}
	}
	return part;
}

function minRating(ratings) {
	let least = ratings[0];
	// assumes ratings.length > 0
	for (let i=1; i<ratings.length; ++i) {
		least = ratings[i].rating < least.rating ? ratings[i] : least;
	}
	return least;
}

function getNewCoords(coords, direction) {
	log(direction);
	return {
		x: coords.x + directionDelta[direction].x,
		y: coords.y + directionDelta[direction].y,
	};
};

function canMoveInDirection(coords, direction, map) {
	return MapUtils.canSnakeMoveInDirection(direction, coords, map)
		&& !MapUtils.isCoordinateOutOfBounds(getNewCoords(coords, direction), map);
}

function basicAvoidance(coords, map, direction) {
	return avoid(direction, d => !canMoveInDirection(coords, d, map));
}

function willDie(userId, map, direction) {
	const coords = MapUtils.getSnakePosition(userId, map);
	if (!MapUtils.canSnakeMoveInDirection(direction, coords, map)) {
		return true;
	}
}

function dont(id, map, direction) {
	const coords = MapUtils.getSnakePosition(id, map);
	for (let i=0; i<4 && !MapUtils.canSnakeMoveInDirection(direction, coords, map); ++i) {
		const dold = direction;
		direction = rotate(direction);
		log(`Couldn't move ${dold}; rotating to ${direction}`);
	}
	return direction;
}

function rotate(direction) {
	if (direction == "UP") {
		return "RIGHT";
	}
	else if (direction == "RIGHT") {
		return "DOWN";
	}
	else if (direction == "DOWN") {
		return "LEFT";
	}
	else {
		return "UP";
	}
}

function avoid(direction, heuristic) {
	for (let i=0; i<4 && heuristic(direction); ++i) {
		const dold = direction;
		direction = rotate(direction);
		log(`Couldn't move ${dold} by ${heuristic.name}; rotating to ${direction}`);
	}
	return direction;
}

function getSnakeHeading(snake, map) {
	const coords = MapUtils.translatePositions(snake.getPositions(), map.getWidth());
	if (coords.length < 2) {
		return { x: 1, y: 0 };
	}
	
	const ox = coords[0].x - coords[1].x;
	const oy = coords[0].y - coords[1].y;

	return { x: ox, y: oy };
}

function selectTarget(selfId, map) {
	if (!target) {
		// Select random target
		// TODO: maybe consider proximity?
		const infos = map.getSnakeInfos().filter(i => i.getId() !== selfId);
		target = infos[Math.floor(Math.random() * infos.length)];
		log(`Targeting ${target.getName()} (${target.getId()})`);
	}
	else {
		// Make sure we have up-to-date information
		target = map.getSnakeInfoForId(target.getId());
	}
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
	log(event);
	if (target && event.payload.getPlayerId() === target.getId()) {
		log("Untargeting");
		target = null;
	}
	else if (event.payload.getPlayerId() === us) {
		log("We died :(");
	}
	// Implement as needed.
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


