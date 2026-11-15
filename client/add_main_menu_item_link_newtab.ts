/**
 * `add_main_menu_item_link`, but the link opens in a new tab, as the official modules' rules links do (they write
 * them in play.html with `target="_blank"`). It stays a link, so middle-click and "copy link" work as usual.
 */
export function add_main_menu_item_link_newtab(text: string, url: string): HTMLAnchorElement {
  add_main_menu_item_link(text, url)
  // add_main_menu_item_link returns nothing; the link it just added is the last one to the URL.
  const links = [...document.querySelectorAll<HTMLAnchorElement>("#toolbar details menu a")]
    .filter(a => a.getAttribute("href") === url)
  const link = links[links.length - 1]
  if (!link) throw new Error(`add_main_menu_item_link added no link to ${url}`)
  link.target = "_blank"
  return link
}
