interface BaseView {
  readonly log: unknown[];
  readonly log_start: number;
  readonly prompt: string;
  readonly actions: {};
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

  /** The role panels, by the role name and by its index. */
  const roles: Record<string, { stat: HTMLElement } | undefined>;

  /** Toggle between the fitted and the full-size map. */
  function toggle_zoom(): void;

  /** Call this when player performs an action (such as clicking on a piece).
   If the action is not in the legal list of actions in the view object,
   this function does nothing and returns false. Returns true if the action is legal.
   */
  function send_action(verb: string, noun: unknown): void;

  /** Show a push button in the top bar for a simple action (if the action is legal). */
  function action_button(verb: string, label: string): void;

  /** Show a push button in the top bar for an action taking a specific argument (if the action with the argument is legal). */
  function action_button_with_argument(verb: string, noun: unknown, label: string): void;

  /** Same as send_action but pop up a confirmation dialog first. */
  function confirm_send_action(verb: string, noun: unknown, question: string): void;

  /** Same as action_button but pop up a confirmation dialog first. */
  function confirm_action_button(verb: string, label: string, question: string): void;

  /** Send a "query" message to the rules. The result will be passed to on_reply. */
  function send_query(what: unknown): void;

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
