import { useId } from "react";
import { useHeldState } from "./held-state";
import { formatMoneyForCity } from "../../content/currency";
import { ConfirmActionButton } from "../../components/ConfirmActionButton";
import { Modal, ModalAnswers, ModalTitle } from "../../components/Modal";
import { characterImage } from "../../content/character-assets";
import { findCharacter } from "../../components/character-catalog";
import type { GameState } from "../../domain/game";
import { currentShop, shopOutfits, shopTalks, type ShopOutfitChoice } from "../../domain/outfits";
import { shopScenesNow } from "../../domain/occasion";
import { HeroineNote } from "../battle/HeroineNote";
import { withNames } from "../romance/names";
import "./shop-card.css";
import { FitText } from "../../components/FitText";
import { ignoreRepeat } from "./PlaceCard";

/** The served path of the heroine in a costume (its neutral picture), or null when it has none. */
function outfitPicture(costume: string): string | null {
  const heroine = findCharacter("heroine");
  return heroine ? characterImage(heroine, { costume, emotion: "neutral" }) : null;
}

/**
 * The city's shop's card under free time's row (2026-11-20 user decision; shop/catalog.json): its name and what kind of
 * shop it is, the heroine's few words there (after a purchase, her words about what was bought), then each outfit it sells
 * with her small standing picture in it, its description and price. 「買う」 asks once more in a dialog (the budget after
 * it), then pays once (outfits.ts buyOutfit); an outfit bought offers 「着てみる」 (or says she wears it). Bought outfits
 * stay the party's for the rest of the journey: the header's 「服」 changes between them and 普段の服.
 * A talking shop (2026-11-26: scenes at `# at: shop <shop>`, outfits.ts shopTalks) has no 「買う」: its 「店に入る」 opens its
 * scenes, where the price is agreed and the outfit is got, and each outfit not owned shows what the shop first asks (言い値).
 * In the row a swipe up on the shop's photo card goes in, as the other destinations go (2026-11-28 user decision), and its
 * 「店に入る」 is for screen readers and keys only (`quietGo`).
 */
export function ShopCard({ game, onBuy, onWear, onEnter, heading = true, quietGo = false }: {
  game: GameState;
  onBuy: (outfitId: string) => boolean;
  onWear: (outfitId: string) => boolean;
  onEnter: () => boolean;
  heading?: boolean;
  /** 「店に入る」 for screen readers and keys only (the row, where a swipe up on the photo card goes in). */
  quietGo?: boolean;
}) {
  const id = useId();
  const [confirm, setConfirm] = useHeldState<ShopOutfitChoice | null>("shop:confirm", null);
  const [bought, setBought] = useHeldState<string | null>("shop:bought", null);
  const shop = currentShop(game);
  if (!shop) return null;
  const cityId = game.currentCityId;
  const money = (amount: number) => formatMoneyForCity(cityId, amount);
  const choices = shopOutfits(game);
  const talks = shopTalks(shop.id);
  const canEnter = talks && shopScenesNow(game).length > 0;
  const boughtOutfit = choices.find((choice) => choice.outfit.id === bought && choice.owned)?.outfit;
  // Her words about what was just bought, else her words about the shop (none: no note).
  const line = boughtOutfit ? boughtOutfit.boughtLineJa : shop.heroineLineJa;
  return <section className="place-card shop-card" data-testid="shop-card" aria-labelledby={`${id}-name`}>
    <h2 id={`${id}-name`} className={heading ? "place-card-name" : "sr-only"}><FitText text={shop.nameJa} /></h2>
    <p className="place-card-hook">{shop.descriptionJa}</p>
    {/* A new note when something is bought, so it comes in again (place-card-heroine). */}
    {line && <HeroineNote key={boughtOutfit?.id ?? "shop"} className="place-card-heroine" label={game.heroineName} hideLabel
      text={withNames(line, game)} emotion={boughtOutfit ? "happy" : "smile"} cityId={cityId} testId="shop-heroine-line" />}
    {canEnter && <button type="button" className={`primary shop-enter${quietGo ? " is-quiet" : ""}`} data-testid="shop-enter"
      onKeyDown={ignoreRepeat} onClick={() => onEnter()}>店に入る</button>}
    <ul className="shop-outfits" aria-label="売っている服">
      {choices.map((choice) => {
        const { outfit } = choice;
        const picture = outfitPicture(outfit.costume);
        const worn = game.outfit === outfit.id;
        return <li key={outfit.id} className="shop-outfit" data-testid={`shop-outfit-${outfit.id}`}>
          <span className="shop-outfit-figure" aria-hidden="true">
            {picture && <img src={`${import.meta.env.BASE_URL}${picture}`} alt="" loading="lazy" decoding="async" draggable={false} />}
          </span>
          <div className="shop-outfit-text">
            <h3 className="shop-outfit-name">{outfit.nameJa}</h3>
            <p className="shop-outfit-description">{outfit.descriptionJa}</p>
            {choice.owned
              ? worn
                ? <p className="shop-outfit-state" data-testid="shop-outfit-worn">着ています</p>
                : <button type="button" className="secondary shop-outfit-action" data-testid="shop-outfit-wear" onClick={() => onWear(outfit.id)}>着てみる</button>
              : talks
                ? <p className="shop-outfit-asking" data-testid="shop-outfit-asking">店の言い値 {money(outfit.price)}</p>
                : <button type="button" className="primary shop-outfit-action" data-testid="shop-outfit-buy" disabled={!choice.available}
                onClick={() => setConfirm(choice)}>
                <span>買う</span><span className="shop-outfit-price">{money(outfit.price)}</span>
              </button>}
            {choice.owned && <p className="fine-print">購入済み。上の「服」から、いつでも着替えられます。</p>}
            {!choice.owned && choice.reason && <p className="fine-print">{choice.reason}</p>}
          </div>
        </li>;
      })}
    </ul>
    {confirm && <Modal labelledBy={`${id}-confirm`} className="travel-choice-modal" onClose={() => setConfirm(null)}>
      <ModalTitle id={`${id}-confirm`}>{confirm.outfit.nameJa}を買う</ModalTitle>
      <p>{confirm.outfit.nameJa}を{money(confirm.outfit.price)}で買いますか？</p>
      <p className="fine-print">買ったあとの旅行予算：{money(game.travelBudget - confirm.outfit.price)}。買った服は、この旅のあいだ、上の「服」から着替えられます。</p>
      <ModalAnswers
        cancel={<button type="button" className="secondary" onClick={() => setConfirm(null)}>やめる</button>}
        action={<ConfirmActionButton className="primary" data-testid="shop-buy-confirm" onClick={() => {
          if (!onBuy(confirm.outfit.id)) return;
          setBought(confirm.outfit.id);
          setConfirm(null);
        }}>買う</ConfirmActionButton>} />
    </Modal>}
  </section>;
}
