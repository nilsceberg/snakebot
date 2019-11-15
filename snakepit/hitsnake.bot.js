/**
 * Snake Bot script.
 */
const MapUtils = require('../domain/mapUtils.js');

let log = null; // Injected logger

let target = null;

function onMapUpdated(mapState, myUserId) {
	const map = mapState.getMap();
	let direction = 'DOWN'; // <'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>
	const snakeBrainDump = {
		target: target,
	}; // Optional debug information about the snakes current state of mind.

	// Make sure we have a target
	selectTarget(myUserId, map);

	// 1. Where's what etc.
	const myCoords = MapUtils.getSnakePosition(myUserId, map);
	log('I am here:', myCoords);
	snakeBrainDump.myCoords = myCoords;

	const targetId = target.getId();
	const targetHead = MapUtils.getSnakePosition(targetId, map);

	// 2. Do some nifty planning...
	const [ ox, oy ] = [
		targetHead.x - myCoords.x,
		targetHead.y - myCoords.y,
	];

	if (Math.abs(ox) >= Math.abs(oy)) {
		direction = ox > 0 ? "RIGHT" : "LEFT";
	}
	else {
		direction = oy > 0 ? "DOWN" : "UP";
	}

	// 3. Then shake that snake!
	return {
		direction,
		debugData: snakeBrainDump
	};
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

module.exports = {
	bootStrap,
	onGameEnded,
	onGameResult,
	onGameStarted,
	onMapUpdated,
	onSnakeDied,
	onTournamentEnded
};

