export const ShorteningCommonData = {
    subsumes : "⊑",
    subsumesDisplay : " ⊑ ",
    exists : "∃",
    and : "⊓",
    or : "⊔",
    forall : "∀",
    not:"¬",
    equivalence : "≡",
    equivalenceDisplay : " ≡ ",
    dot : ".",
    disjoint : "disjoint",
    domain : "domain",
    range : "range",
    regPar : /[()]/g,
    regOpenParConExp : /\.[(]+/g,
    regCap : /[A-Z]/g,
    regEquals : /\(.*\) = \(?.*\)?/g,///\([^)]+\)\s*=\s*[A-Za-z0-9]+/g,
    sepReg : new RegExp("⊓"+"|"+"⊔", "g"),
    regInnerPar : /\([^()]+\)/g,
}

export function fillMaps(ccString, originalString, obj) {
    if (obj._FullToCC.has(originalString))
        return;

    if (!obj._CCToFull.has(ccString)) {
        obj._CCToFull.set(ccString, originalString);
        obj._FullToCC.set(originalString, ccString);
        obj._CCToCount.set(ccString, 1);
    }
    else if (obj._CCToFull.get(ccString) !== originalString) {
        obj._CCToFull.set(ccString + obj._CCToCount.get(ccString), originalString);
        obj._FullToCC.set(originalString, ccString + obj._CCToCount.get(ccString));
        obj._CCToCount.set(ccString, obj._CCToCount.get(ccString) + 1);
    }
}