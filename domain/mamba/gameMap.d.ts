import { SnakeInfo } from "./snakeInfos";

export interface GameMap {
	getWidth(): number;
	getHeight(): number;
	getWorldTick(): number;
	getFoodPositions(): Position[];
	getObstaclePositions(): Position[];
	getSnakeInfos(): SnakeInfo[];
	getSnakeInfoForId(playerId: string): SnakeInfo;
}
