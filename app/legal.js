// Protections : acceptation au premier lancement, conditions d'utilisation, bandeau sécurité, pied de page.
import { t } from './src/i18n/index.js';

// À incrémenter quand les conditions changent : l'utilisateur doit les accepter à nouveau.
export const TERMS_VERSION = 1;

const TERMS = [
  ['Objet', "Groupset Compatibility Toolbox est une aide à la décision : elle indique des compatibilités entre pièces de vélo à partir de sources publiques citées. Elle ne remplace ni la notice du fabricant ni l'avis d'un mécanicien professionnel."],
  ['Responsabilité de l\'utilisateur', "Le choix, l'achat, le montage et le réglage des pièces restent sous votre seule responsabilité. Vérifiez toujours le montage avant de rouler et, en cas de doute, faites contrôler le vélo par un professionnel."],
  ['Freinage', "Les freins sont des organes de sécurité. L'appli ne propose pour eux que des compatibilités officielles ou connues, jamais de solution de dépannage. Tout montage ou intervention sur les freins doit être contrôlé par un professionnel avant de rouler."],
  ['Données', "Les données viennent de documents publics des fabricants, revendeurs et de la communauté, avec leur source et leur niveau de confiance. Elles peuvent être incomplètes, contenir des erreurs ou évoluer. Les données marquées « non vérifié » ou « à valider » n'ont pas de confirmation du fabricant."],
  ['Limitation de responsabilité', "Dans les limites permises par la loi, l'éditeur ne peut être tenu responsable des dommages résultant d'un montage, d'un réglage ou d'un achat effectué à partir des informations de l'appli. Rien dans ces conditions ne limite les droits que la loi vous garantit."],
  ['Marques', "L'appli n'est ni affiliée à Shimano, SRAM, Campagnolo ni aux autres marques citées, ni approuvée par elles. Les noms et références sont cités uniquement pour décrire les pièces."],
  ['Propriété', "L'appli et sa base de données sont protégées (droit d'auteur et droit des producteurs de bases de données). Leur extraction, copie ou réutilisation, en tout ou en partie, est interdite sans autorisation écrite."],
  ['Vie privée', "L'appli fonctionne hors ligne. Votre vélo et vos projets restent sur votre téléphone ; aucune donnée personnelle n'est collectée ni transmise."],
];

export function termsHtml() {
  return TERMS.map(([h, p]) => `<h3>${t(h)}</h3><p>${t(p)}</p>`).join('');
}

export function safetyBanner() {
  return `<p class="safety" role="note"><span aria-hidden="true">🛑</span> ${t('Organe de sécurité : faites contrôler le montage par un professionnel avant de rouler.')}</p>`;
}

/** Écran affiché tant que les conditions n'ont pas été acceptées. */
export function gateHtml() {
  return `<section class="summary gate">
    <h2>${t('Avant de commencer')}</h2>
    <ul class="gate-points">
      <li>🧭 ${t('Aide à la décision : ne remplace pas un mécanicien ni la notice du fabricant.')}</li>
      <li>🔧 ${t('Vérifiez toujours le montage avant de rouler.')}</li>
      <li>🛑 ${t('Freins : faites contrôler par un professionnel. Aucune solution de dépannage n\'est proposée sur les freins.')}</li>
      <li>⚠️ ${t('Données « non vérifié » ou « à valider » : sans confirmation du fabricant.')}</li>
    </ul>
    <details><summary>${t('Lire les conditions d\'utilisation')}</summary><div class="terms">${termsHtml()}</div></details>
    <label class="accept"><input type="checkbox" id="accept-box"> ${t('J\'ai lu et j\'accepte les conditions d\'utilisation.')}</label>
    <div class="btn-row"><button class="btn" type="button" id="accept-btn" disabled>${t('Continuer')}</button></div>
  </section>`;
}

export function conditionsHtml() {
  return `<section class="summary terms"><h2>${t('Conditions d\'utilisation')}</h2>${termsHtml()}</section>
    <div class="btn-row"><a class="btn ghost" href="#/">‹ ${t('Retour')}</a></div>`;
}

export function footerHtml(meta) {
  const base = meta ? t('Base du {0} · {1} pièces', meta.date, meta.parts) : '';
  return `<p>${t('Aide à la décision : ne remplace pas un mécanicien.')} ${t('Non affilié à Shimano, SRAM, Campagnolo ni aux autres marques citées ; noms cités à titre descriptif.')}</p>
    <p>${base ? `${base} · ` : ''}<a href="#/conditions">${t('Conditions d\'utilisation')}</a></p>`;
}
