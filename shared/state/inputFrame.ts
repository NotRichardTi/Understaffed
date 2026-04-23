export interface InputFrame {
  playerId: string;
  stationId: string;
  aimX: number;
  aimY: number;
  moveX: number;
  moveY: number;
  repairHeld: boolean;
  stationSwitchRequest: string | null;
  aiCommand: { targetCrewId: string; destination: string } | null;
  voteChoice: number | null;
}

export function emptyInputFrame(playerId: string, stationId: string): InputFrame {
  return {
    playerId,
    stationId,
    aimX: 0,
    aimY: 0,
    moveX: 0,
    moveY: 0,
    repairHeld: false,
    stationSwitchRequest: null,
    aiCommand: null,
    voteChoice: null,
  };
}
