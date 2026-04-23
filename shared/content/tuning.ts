export const TICK_HZ = 30;
export const TICK_DT_SEC = 1 / TICK_HZ;

export const WORLD_HALF_W = 700;
export const WORLD_HALF_H = 360;
export const SPAWN_MARGIN = 40;

export const SHIP_POS_X = -300;
export const SHIP_POS_Y = 0;
export const SHIP_HALF_W = 128;
export const SHIP_HALF_H = 64;

export const HULL_START = 100;
export const SHIELD_START = 100;

export const GUN_TOP_OFFSET_Y = 70;
export const GUN_BARREL_LEN = 38;
export const GUN_BASE_OFFSET_Y = 24;
export const GUN_ROTATE_SPEED_RAD_PER_SEC = 2.4;
export const GUN_FIRE_COOLDOWN_SEC = 1 / 3;

export const PLAYER_BULLET_SPEED = 700;
export const PLAYER_BULLET_DAMAGE = 10;
export const PLAYER_BULLET_SIZE = 6;
export const PLAYER_BULLET_TTL_SEC = 2.5;

export const FIGHTER_HP = 20;
export const FIGHTER_SPEED = 90;
export const FIGHTER_SIZE = 32;
export const FIGHTER_STOP_DIST = 350;
export const FIGHTER_FIRE_COOLDOWN_SEC = 1.8;

export const SWARMER_HP = 8;
export const SWARMER_SPEED = 180;
export const SWARMER_SIZE = 20;
export const SWARMER_CONTACT_DAMAGE = 8;
export const SWARMER_MELEE_COOLDOWN_SEC = 1.0;

export const TANK_HP = 70;
export const TANK_SPEED = 38;
export const TANK_SIZE = 46;
export const TANK_STOP_DIST = 420;
export const TANK_FIRE_COOLDOWN_SEC = 3.5;
export const TANK_SHELL_SPEED = 140;
export const TANK_SHELL_DAMAGE = 22;
export const TANK_SHELL_AOE = 90;
export const TANK_SHELL_SIZE = 14;
export const TANK_SHELL_TTL_SEC = 5;

export const SNIPER_HP = 16;
export const SNIPER_SPEED = 30;
export const SNIPER_SIZE = 26;
export const SNIPER_STOP_DIST = 620;
export const SNIPER_FIRE_COOLDOWN_SEC = 4.5;
export const SNIPER_WINDUP_SEC = 1.4;
export const SNIPER_SHOT_SPEED = 900;
export const SNIPER_SHOT_DAMAGE = 26;
export const SNIPER_SHOT_SIZE = 7;

export const MINIBOSS_HP = 260;
export const MINIBOSS_SPEED = 50;
export const MINIBOSS_SIZE = 72;
export const MINIBOSS_STOP_DIST = 500;
export const MINIBOSS_FIRE_COOLDOWN_SEC = 2.2;
export const MINIBOSS_SPAWN_COOLDOWN_SEC = 4.5;
export const MINIBOSS_FIRST_SPAWN_SEC = 90;
export const MINIBOSS_INTERVAL_SEC = 75;

export const BOSS_HP = 1400;
export const BOSS_SPEED = 40;
export const BOSS_SIZE = 110;
export const BOSS_STOP_DIST = 450;
export const BOSS_FIRE_COOLDOWN_SEC = 1.2;
export const BOSS_SPAWN_SEC = 300;

export const DIFFICULTY_SPAWN_DIV_FLOOR = 0.35;
export const DIFFICULTY_SPAWN_SCALE_PER_MIN = 0.22;

export const ENEMY_BULLET_SPEED = 260;
export const ENEMY_BULLET_DAMAGE = 5;
export const ENEMY_BULLET_SIZE = 8;
export const ENEMY_BULLET_TTL_SEC = 4;

export const ENEMY_SPAWN_INTERVAL_SEC = 2.5;

export const XP_ORB_SIZE = 10;

export const SHIELD_COOLDOWN_SEC = 8;
export const SHIELD_REPAIR_RATE_PER_SEC = 20;
export const SHIELD_REGEN_DELAY_SEC = 3;

export const DRIVER_SPEED = 220;

export const TRANSIT_DURATION_SEC = 3;

export const XP_MAGNET_RADIUS = 140;
export const XP_MAGNET_SPEED = 260;
export const XP_PICKUP_RADIUS = 18;
export const XP_ORB_VALUE = 5;

export function xpThresholdForLevel(level: number): number {
  return 30 + (level - 1) * 20;
}

export const UPGRADE_CHOICES_PER_LEVEL = 3;

export const STATION_OFFSET_DRIVER_X = -70;
export const STATION_OFFSET_DRIVER_Y = 0;
export const STATION_OFFSET_REPAIR_X = 60;
export const STATION_OFFSET_REPAIR_Y = 0;
export const GUN_OFFSET_TOP_Y = 60;
export const GUN_OFFSET_BOT_Y = -60;
export const GUN_OFFSET_X_LEFT = -30;
export const GUN_OFFSET_X_CENTER = 10;
export const GUN_OFFSET_X_RIGHT = 40;
