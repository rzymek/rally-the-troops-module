interface BaseView {
  readonly log: unknown[];
  readonly log_start: number;
  readonly prompt: string;
  readonly actions: {};
}

/** A role panel, as created by the client for each role in the game. */
interface RolePanel {
  /** Index of the role in the game's role list. */
  readonly index: number;
  /** Role name. */
  readonly role: string;
  /** Name of the user playing the role (if any). */
  readonly user_name: string | undefined;
  /** Role name with non-word characters replaced by "_", usable as a CSS class name. */
  readonly class_name: string;
  /** Id of the role panel element ("role_" + class_name). */
  readonly id: string;
  /** The role panel element (div.role). */
  readonly element: HTMLElement;
  /** The role name element (.role_name). */
  readonly name: HTMLElement;
  /** The role status element (.role_stat) - put game specific info here. */
  readonly stat: HTMLElement;
  /** The user name element (.role_user). */
  readonly user: HTMLElement;
}

declare global {
  /** This variable holds the name of the current role the player has in this browser window.
   The value may change if the client is in replay mode. */
  const player: GameTypes extends {player: infer Player} ? Player : string;

  /** Extension point: a game may narrow `player` by merging `player: "White" | "Black"` into this. */
  interface GameTypes {}

  /** Extension point: each game merges its own view fields into this. */
  interface GameView {}

  /** This object contains the view for the role as returned by the rules view method. */
  const view: BaseView & GameView;

  /** The static view as returned by the rules (constant for the whole session). Also passed to on_init. */
  const static_view: unknown;

  /** The scenario of the current game. Also passed to on_init. */
  const game_scenario: string;

  /** The options of the current game. Also passed to on_init. */
  const game_options: {};

  /** Parameters of the current client page, parsed from the URL. */
  const params: {
    readonly title_id: string;
    readonly game_id: string | 0;
    readonly role: string;
    readonly mode: "play" | "replay" | "debug" | (string & {});
  };

  /** The role panels, by the role name and by its index. */
  const roles: Record<string | number, RolePanel | undefined> & { readonly length: number };

  /* ---- Actions ---- */

  /** Call this when player performs an action (such as clicking on a piece).
   If the action is not in the legal list of actions in the view object,
   this function does nothing and returns false. Returns true if the action is legal.
   */
  function send_action(verb: string, noun?: unknown, extra?: unknown[]): boolean;

  /** Show a push button in the top bar for a simple action (if the action is legal).
   * If label is omitted, the action's value in view.actions (when a string) is used as the label. */
  function action_button(verb: string, label?: string): void;

  /** Show a push button in the top bar for an action taking a specific argument (if the action with the argument is legal). */
  function action_button_with_argument(verb: string, noun: unknown, label: string): void;

  /** Same as send_action but pop up a confirmation dialog first. */
  function confirm_send_action(verb: string, noun: unknown, question: string): void;

  /** Same as action_button but pop up a confirmation dialog first. */
  function confirm_action_button(verb: string, label: string | undefined, question: string): void;

  /** Same as action_button_with_argument but pop up a confirmation dialog first. */
  function confirm_action_button_with_argument(verb: string, noun: unknown, label: string, question: string): void;

  /** Send a "query" message to the rules. The result will be passed to on_reply. */
  function send_query(what: unknown, param?: unknown): void;

  /* ---- Toolbar & main menu ---- */

  /** Add an icon button to the toolbar (or return the existing button with that id).
   * @param where 0 = right after the main menu, 1 = at the end of the toolbar.
   * @param id element id of the button.
   * @param img name of an SVG in /images/ (without the ".svg" extension).
   * @param fn click handler. */
  function add_icon_button(where: number, id: string, img: string, fn: (evt: MouseEvent) => void): HTMLButtonElement;

  /** Add an item to the main (hamburger) menu, above the first separator. */
  function add_main_menu_item(text: string, onclick: (evt: MouseEvent) => void): void;

  /** Add a link item to the main (hamburger) menu, above the first separator. */
  function add_main_menu_item_link(text: string, url: string): void;

  /** Add a separator at the top of the main (hamburger) menu. */
  function add_main_menu_separator(): void;

  /** Close all open toolbar menus except the given one (pass null to close all). */
  function close_toolbar_menus(self: Element | null): void;

  /** Toggle fullscreen mode. */
  function toggle_fullscreen(): void;

  /** Toggle visibility of the log panel (aside). */
  function toggle_log(): void;

  /* ---- Map / zoom ---- */

  /** Toggle between the fitted and the full-size map. */
  function toggle_zoom(): void;

  /** Recompute the zoom/pan transform (e.g. after the layout has changed). */
  function update_zoom(): void;

  /** Tell the pan & zoom code that the map size has changed. */
  function update_map_size(width: number, height: number): void;

  /* ---- DOM utilities ---- */

  /** Smoothly scroll the element into the center of the view (hides the log panel on small screens). */
  function scroll_into_view(e: Element): void;

  /** Smoothly scroll the element into view, only as much as needed. */
  function scroll_into_view_if_needed(e: Element): void;

  /** Enable panning the panel by dragging with the middle mouse button. */
  function scroll_with_middle_mouse(panel_selector: string, multiplier?: number): void;

  /** Make an element (e.g. a floating panel) movable by dragging the grabber (defaults to the element itself). */
  function drag_element_with_mouse(element: string | Element, grabber?: string | Element): void;

  /** Make an element resizable by dragging the grabber (defaults to the element itself). */
  function resize_element_with_mouse(element: string | Element, grabber?: string | Element): void;

  /* ---- Hooks implemented by the game ---- */

  /** This function is called whenever the "view" object has updated.
   * It should update the visible game representation and highlight possible actions.
   *
   * The client code has already updated the prompt message and log when this is called.
   *
   * The view.actions object contains the list of legal actions to present. */
  let on_update: () => void;

  /** This function is called when the client has connected to the server,
   * and provides the game setup information: scenario, options,
   * and any static data that will remain constant for the entire session
   * but changes from game to game (for example a randomized map). */
  let on_init: (scenario: string, options: {}, static_view: unknown) => void;

  /** Optional function called with the full game log when it has been (re)loaded. */
  let on_init_log: ((log: string[]) => void) | undefined;

  /** Optional function called after the pie rule has swapped the player's role (player and roles are already updated). */
  let on_pie: (() => void) | undefined;

  /** Optional function to implement custom HTML formatting of the prompt text.
   * If present, this function must return an HTML string. */
  let on_prompt: (prompt: string) => string;

  /** Optional function to implement custom HTML formatting of log messages.
   * If present, this function must return an HTML element representing the given text. */
  let on_log: (text:string, index:number)=>HTMLElement;

  /** This function is invoked with the result of send_query. The what parameter matches the argument to send_query and is used to identify different queries.

   See rommel-in-the-desert and wilderness-war for examples of using the query mechanism. */
  let on_reply: (what:unknown, response:unknown) => void;
}

export {};
