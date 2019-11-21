import { SnakeInfo } from "./snakeInfos";

export interface GameMap {
	getWidth(): number;
	getHeight(): number;
	getWorldTick(): number;
	getFoodPositions(): Position[];
	getObstaclePositions(): Position[];
	getSnakeInfo(): SnakeInfo[];
	getSnakeInfoForId(playerId: string): SnakeInfo;
}
