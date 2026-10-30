/**
 * The 78-card Rider-Waite-Smith deck (Pamela Colman Smith, 1909; public domain).
 * Images live in public/tarot/<id>.jpg. Scene descriptions and meanings are our own words.
 *
 * Card index 0-21 = major arcana; 22-35 wands, 36-49 cups, 50-63 swords, 64-77 pentacles
 * (ace through ten, then page, knight, queen, king).
 */

export type Suit = "wands" | "cups" | "swords" | "pentacles";
export type YesNoNature = "yes" | "no" | "maybe";

export interface TarotCard {
  index: number;
  id: string;
  name: string;
  arcana: "major" | "minor";
  suit: Suit | null;
  /** What is drawn on the card. */
  scene: string;
  upright: { keywords: string[]; meaning: string };
  reversed: { keywords: string[]; meaning: string };
  /** The card's leaning in a yes/no pull when upright. */
  nature: YesNoNature;
}

type Row = [name: string, scene: string, up: string, upMeaning: string, rev: string, revMeaning: string, nature: YesNoNature];

const MAJOR_SLUGS = [
  "fool", "magician", "high-priestess", "empress", "emperor", "hierophant", "lovers", "chariot", "strength", "hermit",
  "wheel-of-fortune", "justice", "hanged-man", "death", "temperance", "devil", "tower", "star", "moon", "sun", "judgement", "world",
];

const MAJORS: Row[] = [
  ["The Fool", "A young traveller in bright clothes steps toward a cliff edge, a white rose in one hand and a small bundle on a staff over his shoulder, while a white dog leaps at his heels under a yellow sky.", "beginnings, spontaneity, trust, a leap of faith", "A fresh start met with openness: trust the step even without the whole map.", "recklessness, hesitation, naivety, holding back", "Either rushing in without looking, or fear stopping a step you are ready for.", "yes"],
  ["The Magician", "A figure in a red robe raises a wand to the sky and points the other hand to the earth. On the table before him lie a cup, a sword, a pentacle and a wand; an infinity sign floats above his head, with roses and lilies around him.", "skill, focus, willpower, resourcefulness", "You already hold the tools you need; direct your attention and act.", "scattered energy, manipulation, untapped talent, self-doubt", "Talent is unused or misused; watch for tricks, including the stories you tell yourself.", "yes"],
  ["The High Priestess", "A woman in blue robes sits between a black pillar marked B and a white pillar marked J, a scroll marked TORA in her lap and a crescent moon at her feet. A veil patterned with pomegranates hangs behind her.", "intuition, inner knowing, mystery, stillness", "The answer comes from quiet listening, not from pushing.", "ignored intuition, secrets, disconnection, noise", "You are overriding your gut, or something hidden is shaping events.", "maybe"],
  ["The Empress", "A crowned woman rests on cushions in a field of ripe wheat beside a forest and a waterfall, a heart-shaped shield bearing the symbol of Venus at her side.", "abundance, nurturing, creativity, comfort", "A season of growth: tend what you are growing, including yourself.", "creative block, dependence, neglect, smothering", "Care is out of balance: giving too much, or not tending your own needs.", "yes"],
  ["The Emperor", "A bearded ruler in armour beneath red robes sits on a stone throne carved with rams' heads, holding an ankh-topped sceptre and an orb, with bare mountains behind him.", "structure, authority, stability, leadership", "Bring order: clear plans, firm boundaries and steady responsibility.", "rigidity, control, indiscipline, power struggles", "Structure has become a cage, or it is missing altogether.", "yes"],
  ["The Hierophant", "A religious teacher in red robes sits between two grey pillars, raising one hand in blessing over two kneeling monks, with crossed keys at his feet.", "tradition, guidance, learning, shared values", "Learn from established wisdom: a mentor, a teacher or a trusted institution.", "rebellion, unconventional paths, dogma, questioning", "The old rules no longer fit; you may need to find your own way.", "maybe"],
  ["The Lovers", "A man and a woman stand naked beneath a great angel whose arms spread in blessing under a blazing sun. Behind the woman grows a fruit tree with a serpent; behind the man, a tree of flames.", "love, union, choice, aligned values", "A meaningful bond, or a choice made from the heart and true to your values.", "imbalance, misalignment, indecision, disharmony", "There is a gap between what you want and what you are choosing.", "yes"],
  ["The Chariot", "An armoured figure stands in a canopied chariot beneath a starry awning, drawn by one black and one white sphinx, with a walled city behind.", "willpower, determination, victory, direction", "Move forward with focus; you can steer forces that pull different ways.", "lost direction, scattered effort, aggression, stalling", "Momentum is lost or forced; get clear about where you are really going.", "yes"],
  ["Strength", "A woman in white, crowned with flowers, gently closes the jaws of a lion; an infinity sign floats above her head.", "courage, patience, compassion, inner strength", "Gentle steadiness wins where force would fail.", "self-doubt, impatience, low energy, raw emotion", "Fear or frustration has taken the reins; rebuild confidence kindly.", "yes"],
  ["The Hermit", "An old man in a grey cloak stands alone on a snowy peak, holding up a lantern with a six-pointed star and leaning on a staff.", "solitude, reflection, inner guidance, seeking truth", "Step back from the noise so you can hear yourself.", "isolation, loneliness, withdrawal, avoiding reflection", "Solitude has turned into hiding, or you are avoiding the quiet you need.", "maybe"],
  ["Wheel of Fortune", "A great wheel marked with letters and alchemical signs turns among clouds. A sphinx sits on top, a snake slides down one side and a jackal-headed figure rises on the other, while winged creatures read books in the four corners.", "cycles, change, luck, a turning point", "Things are moving; adapt and ride the turn.", "setbacks, resisting change, bad timing, repeating patterns", "A downturn or an old pattern repeats; change what you can in how you respond.", "yes"],
  ["Justice", "A crowned figure in red sits between two pillars, holding an upright sword in one hand and balanced scales in the other, one white shoe showing beneath the robe.", "fairness, truth, cause and effect, accountability", "Clear decisions and honest accounts; outcomes follow actions.", "unfairness, dishonesty, avoided accountability, bias", "Something is off balance; look for what is not being faced honestly.", "maybe"],
  ["The Hanged Man", "A man hangs upside down by one foot from a living T-shaped tree, hands behind his back, his face calm and his head ringed with light.", "pause, surrender, new perspective, letting go", "Wait, and look again from another angle; the pause has a purpose.", "stalling, resistance, indecision, pointless sacrifice", "You are stuck because you will not let go, or you keep sacrificing for nothing.", "maybe"],
  ["Death", "A skeleton in black armour rides a white horse, carrying a black banner with a white rose. A king lies fallen, a bishop prays, children kneel, and the sun rises between two distant towers.", "endings, transformation, transition, clearing", "Something is ending to make room for what comes next. This card means change, not literal death.", "resisting change, stagnation, lingering, fear of endings", "Holding on is prolonging something that is already over.", "no"],
  ["Temperance", "A winged angel stands with one foot in a pool and one on land, pouring water from one cup into another; a path leads toward mountains and a crown of light.", "balance, moderation, patience, blending", "Find the middle way; combine things slowly and with care.", "excess, imbalance, haste, inner conflict", "Too much of something is tipping the balance; recalibrate.", "yes"],
  ["The Devil", "A horned, bat-winged figure squats on a black pedestal. Below, a naked man and woman with small horns and tails are loosely chained to it.", "attachment, temptation, habit, materialism", "Notice what binds you; the chains are looser than they look.", "release, breaking free, awareness, reclaiming power", "You are seeing the trap clearly and beginning to step out of it.", "no"],
  ["The Tower", "Lightning strikes a tall tower on a rocky peak, knocking off its crown. Flames burst from the windows and two figures fall headfirst through the air.", "sudden change, upheaval, revelation, collapse of false structures", "Shaky foundations give way; the clearing is hard but it frees you.", "averted disaster, fear of change, delayed collapse, inner upheaval", "Change is being resisted, or it is happening on the inside.", "no"],
  ["The Star", "A naked woman kneels beside a pool under one large eight-pointed star and seven smaller ones, pouring water onto the land and into the pool; a bird sits in a tree behind her.", "hope, healing, renewal, inspiration", "After difficulty, calm and hope return.", "discouragement, lost faith, disconnection, despair", "Hope feels low; small acts of care will reconnect you.", "yes"],
  ["The Moon", "A full moon with a face shines over a path that winds between two towers. A dog and a wolf howl at it, and a crayfish crawls out of a pool.", "illusion, intuition, uncertainty, dreams", "Not everything is clear yet; move carefully and trust instinct over fear.", "clarity returning, releasing fear, confusion lifting, surfacing emotion", "The fog is lifting, or old fears are rising so they can be seen.", "maybe"],
  ["The Sun", "A smiling child rides a white horse beneath a radiant sun, holding a red banner, with tall sunflowers behind a grey wall.", "joy, success, vitality, clarity", "Things are bright and clear; enjoy it and share it.", "temporary gloom, overconfidence, delays, a dimmed spirit", "Happiness is still there, but muted or delayed.", "yes"],
  ["Judgement", "An angel blows a trumpet hung with a cross-marked banner from the clouds; below, naked figures rise from coffins floating on water, arms outstretched.", "awakening, reckoning, renewal, a calling", "Answer a call; take honest stock and rise to the next stage.", "self-doubt, ignoring the call, harsh self-judgement, stuckness", "Your inner critic is loud, or you are avoiding a reckoning you need.", "yes"],
  ["The World", "A dancing figure wrapped in a purple sash holds two wands inside an oval laurel wreath; an angel, an eagle, a bull and a lion watch from the four corners.", "completion, wholeness, achievement, integration", "A cycle comes together; celebrate it and prepare for the next one.", "incompletion, lack of closure, delays, shortcuts", "Something is nearly done but still needs finishing.", "yes"],
];

const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];

// Rows are [scene, upright keywords, upright meaning, reversed keywords, reversed meaning, nature], ace to king.
type MinorRow = [string, string, string, string, string, YesNoNature];

const WANDS: MinorRow[] = [
  ["A hand reaches from a cloud gripping a sprouting wand; leaves drift down, and a castle stands on a hill below.", "inspiration, a new venture, energy, potential", "A spark of inspiration or a new project wants to begin.", "delays, low motivation, false starts, creative block", "The spark is there but stalled; find what is blocking the fire.", "yes"],
  ["A man in a red hat stands on a castle battlement holding a small globe, one wand in hand and another fixed to the wall, looking out over sea and land.", "planning, future vision, decisions, discovery", "You are weighing a bigger future; plan the route before you set out.", "fear of the unknown, poor planning, playing safe, indecision", "Comfort is winning over growth, or the plan is not yet solid.", "maybe"],
  ["A man seen from behind stands on a cliff among three planted wands, watching ships sail across a golden sea.", "expansion, foresight, progress, opportunity", "Your efforts are under way; look further ahead, as opportunities widen.", "obstacles, delays, frustration, narrow vision", "Plans are slower than hoped; adjust expectations, not the goal.", "yes"],
  ["Four wands topped with a garland form a canopy; two figures raise bouquets in celebration before a castle.", "celebration, homecoming, harmony, milestones", "A moment to celebrate stability, home and the people around you.", "tension at home, transition, lack of support, cancelled plans", "Celebration is muted or the sense of home feels unsettled.", "yes"],
  ["Five young men brandish wands at one another in a chaotic scuffle.", "competition, conflict, rivalry, clashing ideas", "Friction and competition; channel it into healthy challenge.", "avoiding conflict, resolution, inner conflict, easing tension", "The fight is winding down, or it has moved inside you.", "no"],
  ["A man crowned with laurel rides a white horse through a cheering crowd, holding a wand tied with a wreath.", "victory, recognition, public success, confidence", "Your efforts are seen and recognised.", "ego, a fall from grace, lack of recognition, self-doubt", "Recognition is missing, or pride is getting in the way.", "yes"],
  ["A man on high ground defends himself with a wand against six wands rising from below, wearing mismatched shoes.", "standing your ground, perseverance, challenge, conviction", "Hold your position; you have the higher ground.", "overwhelm, giving up, exhaustion, defensiveness", "You are tired of defending; choose which battles matter.", "maybe"],
  ["Eight wands fly diagonally through a clear sky over a river landscape.", "speed, movement, news, momentum", "Things move fast now; messages and progress arrive quickly.", "delays, frustration, waiting, scattered energy", "Momentum slows; be patient and focus your energy.", "yes"],
  ["A wounded man with a bandaged head leans on a wand, eight more standing behind him like a fence.", "resilience, persistence, the last stretch, guardedness", "You are close to the finish; one more push.", "exhaustion, suspicion, giving up, overwhelm", "You are worn down; rest is not the same as quitting.", "maybe"],
  ["A man bends under the weight of ten wands he carries toward a town.", "burden, responsibility, overwork, stress", "You are carrying too much; it is time to share the load.", "release, delegation, collapse under the load, letting go", "Something has to be put down, by choice or by force.", "no"],
  ["A young man in a tunic patterned with salamanders stands in a desert, gazing at the sprouting wand he holds.", "curiosity, enthusiasm, discovery, free spirit", "Exciting news or a new interest calls; explore it.", "impatience, lack of direction, setbacks, procrastination", "Enthusiasm fizzles before it becomes action.", "yes"],
  ["A knight in a salamander-patterned tunic rides a rearing horse across the desert, wand raised.", "action, adventure, passion, impulsiveness", "Bold action and adventure; go for it with passion.", "recklessness, haste, frustration, scattered energy", "Charging ahead without a plan causes trouble.", "yes"],
  ["A queen sits on a throne carved with lions, holding a wand and a sunflower, a black cat at her feet.", "confidence, warmth, determination, independence", "Shine with warm confidence and draw people in.", "jealousy, insecurity, demands, burnout", "Confidence wobbles; refill your own cup first.", "yes"],
  ["A king sits on a throne decorated with lions and salamanders, holding a flowering wand, a small salamander beside him.", "vision, leadership, boldness, entrepreneurship", "Lead with vision and take bold, decisive steps.", "impulsiveness, arrogance, high expectations, domineering", "Leadership turns into control or rash decisions.", "yes"],
];

const CUPS: MinorRow[] = [
  ["A hand reaches from a cloud holding an overflowing cup with five streams; a dove drops a wafer into it above a pond of lotus flowers.", "new feelings, love, compassion, emotional fullness", "Love and feeling flow in; open your heart.", "blocked emotions, emptiness, need for self-love, repression", "Feelings are held back; start by being kind to yourself.", "yes"],
  ["A young man and woman exchange cups; above them a winged lion's head rises over a staff entwined with two snakes.", "partnership, mutual attraction, connection, unity", "A meeting of hearts; a balanced, mutual bond.", "imbalance, broken communication, separation, tension", "The connection is strained; talk honestly.", "yes"],
  ["Three women dance in a circle, raising their cups among fruit and flowers.", "friendship, celebration, community, joy", "Celebrate with the people who lift you.", "overindulgence, gossip, isolation, interference", "The group feels off, or the celebration has gone too far.", "yes"],
  ["A young man sits under a tree with arms crossed, ignoring three cups before him and a fourth offered by a hand from a cloud.", "apathy, contemplation, missed offers, reevaluation", "You may be overlooking something good in front of you.", "renewed interest, acceptance, motivation, seizing a chance", "You are ready to say yes again.", "maybe"],
  ["A cloaked figure looks down at three spilled cups while two upright cups stand behind; a bridge leads to a house across a river.", "loss, grief, regret, disappointment", "Grief is real, but not everything is lost.", "acceptance, moving on, forgiveness, recovery", "You are turning toward what remains.", "no"],
  ["In an old courtyard a boy offers a cup filled with flowers to a smaller girl; other cups hold white blossoms.", "nostalgia, childhood, innocence, kindness", "Warm memories, or simple kindness from the past.", "stuck in the past, rose-tinted memories, moving forward, leaving home", "Let the past inform you without holding you.", "yes"],
  ["A shadowed figure faces seven cups floating in clouds, holding a head, a veiled figure, a snake, a castle, jewels, a wreath and a dragon.", "choices, fantasy, illusion, wishful thinking", "Many options shimmer; not all are real.", "clarity, decisiveness, a reality check, alignment", "The fog clears and the right choice stands out.", "maybe"],
  ["A cloaked figure with a staff walks away from eight stacked cups toward mountains under an eclipsed moon.", "walking away, seeking meaning, disillusion, moving on", "It is time to leave what no longer fulfils you.", "fear of leaving, drifting, staying too long, avoidance", "You know you should go, but you are hesitating.", "no"],
  ["A contented man sits with arms folded before an arched row of nine cups on a blue-draped table.", "contentment, a wish fulfilled, satisfaction, gratitude", "Often called the wish card: satisfaction is within reach.", "smugness, dissatisfaction, materialism, unmet wishes", "Getting what you wanted has not filled the gap.", "yes"],
  ["A couple embraces under a rainbow of ten cups while two children dance beside them, a house in the distance.", "harmony, family, emotional fulfilment, happiness", "Lasting happiness and close bonds.", "disconnection, family strain, misaligned values, tension", "Harmony at home needs attention.", "yes"],
  ["A young man in a flowered tunic gazes at a fish peeking out of his cup, with the sea behind him.", "creativity, intuition, curiosity, tender feelings", "A sweet surprise or creative idea; stay open.", "emotional immaturity, creative block, insecurity, escapism", "Feelings feel fragile; do not hide from them.", "yes"],
  ["A knight on a calmly walking white horse holds out a cup, wings on his helmet and heels, a river ahead.", "romance, charm, following the heart, an invitation", "An offer of the heart arrives; follow it with care.", "moodiness, unrealistic hopes, jealousy, disappointment", "Romantic ideals clash with reality.", "yes"],
  ["A queen sits on a throne at the water's edge, gazing at an ornate closed cup, cherubs carved on her throne.", "compassion, emotional security, intuition, care", "Lead with empathy and trust your feelings.", "emotional overwhelm, codependence, insecurity, martyrdom", "Caring for others is draining you.", "yes"],
  ["A king sits on a throne floating on a rough sea, holding a cup and a sceptre; a ship and a leaping fish appear behind him.", "emotional balance, diplomacy, calm, wisdom", "Stay calm and kind in choppy waters.", "moodiness, manipulation, coldness, volatility", "Emotions are being suppressed or used as leverage.", "yes"],
];

const SWORDS: MinorRow[] = [
  ["A hand reaches from a cloud gripping an upright sword crowned with a wreath, above jagged mountains.", "clarity, breakthrough, truth, a new idea", "A clear truth cuts through confusion.", "confusion, misinformation, clouded judgement, harshness", "Thinking is muddled; get the facts straight.", "yes"],
  ["A blindfolded woman sits by the sea under a crescent moon, holding two crossed swords over her chest.", "stalemate, a difficult choice, avoidance, truce", "You are avoiding a decision; look at the options.", "indecision, information overload, the lesser evil, release", "The deadlock is breaking, one way or another.", "maybe"],
  ["Three swords pierce a red heart against grey rain clouds.", "heartbreak, sorrow, grief, painful truth", "A painful truth or hurt that needs feeling, not hiding.", "recovery, forgiveness, releasing pain, optimism", "Healing has begun.", "no"],
  ["A knight's effigy lies on a tomb with hands joined in prayer, three swords hanging above and one beneath, a stained-glass window behind.", "rest, recovery, retreat, contemplation", "Rest and recover before the next step.", "restlessness, burnout, stagnation, reawakening", "You have pushed too long without rest, or you are ready to return.", "maybe"],
  ["A smirking man gathers swords while two defeated figures walk away under a jagged sky.", "conflict, winning at a cost, tension, defeat", "A win that costs too much is not a win.", "reconciliation, making amends, old resentment, moving on", "Time to repair, or to walk away from the fight.", "no"],
  ["A ferryman poles a boat carrying a cloaked woman and a child toward a calmer shore, six swords standing upright in the boat.", "transition, moving on, leaving behind, a passage", "You are moving toward calmer waters.", "resistance to change, unfinished business, turbulence, stuckness", "Something unresolved keeps pulling you back.", "maybe"],
  ["A man tiptoes away from a camp carrying five swords, glancing back at the two left behind.", "strategy, deception, getting away with something, stealth", "Be strategic, but watch for dishonesty, yours or others'.", "confession, coming clean, conscience, being found out", "The truth wants out.", "no"],
  ["A bound and blindfolded woman stands among eight swords stuck in the ground, water at her feet and a castle behind.", "restriction, feeling trapped, self-limiting beliefs, helplessness", "The trap is partly in the mind; the way out exists.", "release, new perspective, freedom, self-acceptance", "You are loosening the ties that held you.", "no"],
  ["A woman sits up in bed with her face in her hands, nine swords lined up on the dark wall behind her.", "anxiety, worry, sleeplessness, fear", "Worry is louder than reality; share the load.", "hope, reaching out, despair easing, private turmoil", "Talking it through brings relief.", "no"],
  ["A man lies face down with ten swords in his back under a black sky, while a yellow dawn breaks on the horizon.", "a painful ending, rock bottom, betrayal, the worst is over", "An ending hits hard, but dawn follows.", "recovery, regeneration, resisting an end, survival", "You are getting back up.", "no"],
  ["A young figure stands on a windswept hill holding a sword upright, with clouds and birds behind.", "curiosity, new ideas, vigilance, communication", "Ask questions and stay alert.", "gossip, scattered thoughts, defensiveness, all talk", "Words outrun action or fairness.", "maybe"],
  ["A knight charges on a galloping horse with sword raised, clouds and trees blown by the wind.", "ambition, action, drive, quick thinking", "Act fast and decisively on your ideas.", "impulsiveness, aggression, burnout, no direction", "Speed without direction causes damage.", "yes"],
  ["A queen sits in profile on a throne carved with butterflies, her sword upright and one hand raised.", "clarity, honesty, independence, sharp perception", "Say it clearly and honestly.", "coldness, bitterness, harshness, detachment", "Clarity has turned cold; add compassion.", "maybe"],
  ["A king faces forward on a throne carved with butterflies and crescents, holding an upright sword.", "intellect, authority, truth, clear judgement", "Decide with logic and fairness.", "manipulation, tyranny, misuse of power, cold logic", "Reason is being used to control rather than to serve.", "yes"],
];

const PENTACLES: MinorRow[] = [
  ["A hand reaches from a cloud holding a gold pentacle over a garden, where an archway in the hedge opens toward mountains.", "a new opportunity, prosperity, manifestation, groundedness", "A real, practical opportunity is offered; take it.", "a lost opportunity, poor planning, scarcity, greed", "Plans need a firmer foundation.", "yes"],
  ["A young man dances while juggling two pentacles linked by an infinity loop, ships riding high waves behind him.", "balance, adaptability, juggling priorities, flexibility", "Keep the balls in the air with flexibility.", "overwhelm, disorganisation, overcommitment, imbalance", "Too much is in the air; drop something.", "maybe"],
  ["A stonemason works on a cathedral arch while a monk and a hooded figure hold up the plans.", "teamwork, skill, collaboration, learning", "Good work happens together; your skill is valued.", "disharmony, poor teamwork, misalignment, working alone", "The team is not working as one.", "yes"],
  ["A crowned man sits clutching a pentacle to his chest, one balanced on his crown and one under each foot, a city behind him.", "security, saving, control, holding on", "Protect what you have, wisely.", "greed, overspending, letting go, insecurity", "Either gripping too tight or spending too freely.", "maybe"],
  ["Two ragged figures, one on crutches, trudge through snow past a lit stained-glass church window.", "hardship, scarcity, isolation, worry", "A lean patch; help is closer than it seems.", "recovery, help found, improvement, renewed faith", "Things are improving; accept support.", "no"],
  ["A merchant holding scales drops coins into the hand of one of two kneeling beggars.", "generosity, giving and receiving, charity, fairness", "Give and receive fairly.", "debt, strings attached, one-sided giving, self-care", "Check the balance of give and take.", "yes"],
  ["A farmer leans on his hoe, looking at seven pentacles growing on a leafy bush.", "patience, long-term investment, assessment, perseverance", "Growth is slow but real; review and keep tending.", "impatience, poor returns, wasted effort, frustration", "Rethink where your effort is going.", "maybe"],
  ["A craftsman sits at a bench carving pentacles, finished ones displayed on a post, a town far behind him.", "diligence, skill, mastery, craftsmanship", "Steady practice builds mastery.", "perfectionism, lack of focus, cutting corners, boredom", "Quality slips, or perfection stalls progress.", "yes"],
  ["An elegant woman stands in a vineyard heavy with pentacles, a hooded falcon on her gloved hand.", "independence, abundance, self-sufficiency, comfort", "Enjoy what your own work has built.", "overwork, financial setback, superficiality, dependence", "Comfort is fragile, or it costs too much.", "yes"],
  ["An old man in a patterned robe sits with two dogs beneath an archway, a couple and a child nearby, ten pentacles laid across the scene.", "legacy, family wealth, stability, long-term success", "Lasting security for you and those you love.", "family disputes, financial loss, instability, short-term thinking", "Foundations need repair.", "yes"],
  ["A young man stands in a green field holding up a pentacle, studying it carefully.", "ambition, study, a new skill, diligence", "Learn something practical; a promising start.", "lack of progress, procrastination, missed chances, laziness", "Dreams are not yet turning into effort.", "yes"],
  ["A knight sits on a still black horse in a ploughed field, holding a pentacle.", "hard work, routine, reliability, patience", "Slow and steady gets it done.", "boredom, stagnation, laziness, perfectionism", "Routine has become a rut.", "yes"],
  ["A queen sits on a throne in a flowering garden, cradling a pentacle in her lap, a rabbit at her feet.", "nurturing, practicality, security, abundance", "Practical care for home, body and money.", "self-neglect, work-life imbalance, smothering, dependence", "You are caring for everything except yourself.", "yes"],
  ["A king in a robe embroidered with grapevines sits on a throne decorated with bulls, holding a pentacle and a sceptre, a castle behind him.", "wealth, leadership, security, discipline", "Solid success through discipline and good sense.", "greed, stubbornness, materialism, poor financial choices", "Money or status is steering decisions.", "yes"],
];

const kw = (s: string) => s.split(", ");

export const DECK: TarotCard[] = [
  ...MAJORS.map(([name, scene, up, upM, rev, revM, nature], i): TarotCard => ({
    index: i,
    id: `major-${String(i).padStart(2, "0")}-${MAJOR_SLUGS[i]}`,
    name,
    arcana: "major",
    suit: null,
    scene,
    upright: { keywords: kw(up), meaning: upM },
    reversed: { keywords: kw(rev), meaning: revM },
    nature,
  })),
  ...([
    ["wands", WANDS],
    ["cups", CUPS],
    ["swords", SWORDS],
    ["pentacles", PENTACLES],
  ] as const).flatMap(([suit, rows], s) =>
    rows.map(([scene, up, upM, rev, revM, nature], r): TarotCard => ({
      index: 22 + s * 14 + r,
      id: `${suit}-${String(r + 1).padStart(2, "0")}`,
      name: `${RANKS[r]} of ${suit[0].toUpperCase()}${suit.slice(1)}`,
      arcana: "minor",
      suit,
      scene,
      upright: { keywords: kw(up), meaning: upM },
      reversed: { keywords: kw(rev), meaning: revM },
      nature,
    })),
  ),
];

export const cardImage = (card: TarotCard) => `/tarot/${card.id}.jpg`;
