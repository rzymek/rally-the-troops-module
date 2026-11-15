import {afterEach, expect, it, vi} from "vitest"
import {add_main_menu_item_link_newtab} from "../client/index.ts"

afterEach(() => vi.unstubAllGlobals())

// No DOM here: a menu of fake links, which add_main_menu_item_link appends to.
function stubMenu() {
  const links: {href: string, target: string, getAttribute(name: string): string}[] = []
  vi.stubGlobal("add_main_menu_item_link", (_text: string, url: string) => {
    links.push({href: url, target: "", getAttribute: () => url})
  })
  vi.stubGlobal("document", {querySelectorAll: () => links})
  return links
}

it("opens the link it adds in a new tab", () => {
  const links = stubMenu()
  add_main_menu_item_link_newtab("Other", "/game/info/other.html")
  const rules = add_main_menu_item_link_newtab("Rules", "/game/info/rules.html")
  expect(rules).toBe(links[1])
  expect(links.map(a => a.target)).toEqual(["_blank", "_blank"])
})

it("leaves an earlier link to the same URL as it was", () => {
  const links = stubMenu()
  add_main_menu_item_link("Rules", "/game/info/rules.html")
  add_main_menu_item_link_newtab("Rules", "/game/info/rules.html")
  expect(links.map(a => a.target)).toEqual(["", "_blank"])
})
