// Module exports — used by the server/host to drive the game

export declare const roles: string[]
export declare const scenarios: string[]

export declare function setup(seed: number, scenario: string, options?: unknown): unknown
export declare function static_view(state: unknown): unknown
export declare function view(state: unknown, role: string): unknown
export declare function action(state: unknown, role: string, action: string, argument?: unknown): unknown
export declare function finish(state: unknown, result: string | number, message: string): unknown
export declare function query(state: unknown, role: string, q: unknown): unknown
export declare function assert(state: unknown): void

// --- Globals injected by the framework into game code ---

declare global {

	// Control flow
	function log(s?: string): void
	function prompt(s: string): void
	function button(action: string, enabled?: boolean): void
	function action(action: string, argument: unknown): void
	function finish(result: string | number, message: string): void
	function call_or_goto(pred: boolean, name: string, env?: object): void
	function call(name: string, env?: object): void
	function goto(name: string, env?: object): void
	function end(result?: unknown): void
	function resume(): void
	function script(text: string): string

	// Undo support
	function push_undo(): void
	function pop_undo(): void
	function clear_undo(): void

	// Random / shuffle
	function random(range: number): number
	function random_bigint(range: number): number
	function shuffle(list: unknown[]): void
	function shuffle_bigint(list: unknown[]): void

	// Deep copy / diff
	function object_copy<T>(original: T): T
	function object_diff(a: unknown, b: unknown): boolean

	// Array helpers
	function array_delete(array: unknown[], index: number): void
	function array_delete_item(array: unknown[], item: unknown): void
	function array_insert(array: unknown[], index: number, item: unknown): void
	function array_delete_pair(array: unknown[], index: number): void
	function array_insert_pair(array: unknown[], index: number, key: unknown, value: unknown): void

	// Set (sorted array)
	function set_clear(set: unknown[]): void
	function set_has(set: unknown[], item: unknown): boolean
	function set_add(set: unknown[], item: unknown): void
	function set_delete(set: unknown[], item: unknown): void
	function set_toggle(set: unknown[], item: unknown): void

	// Map (sorted flat key/value array)
	function map_clear(map: unknown[]): void
	function map_has(map: unknown[], key: unknown): boolean
	function map_get(map: unknown[], key: unknown, missing?: unknown): unknown
	function map_set(map: unknown[], key: unknown, value: unknown): void
	function map_delete(map: unknown[], key: unknown): void
	function map_get_set(map: unknown[], key: unknown): unknown[]
	function map_for_each(map: unknown[], f: (key: unknown, value: unknown) => void): void

	// Grouping
	function object_group_by<T>(items: T[], callback: ((item: T) => string) | keyof T): Record<string, T[]>
	function map_group_by<T>(items: T[], callback: ((item: T) => unknown) | keyof T): unknown[]
}