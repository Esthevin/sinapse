/**
 * Portadas ilustradas por historia (assets/portadas/<id>.png, 512 px).
 * Se dibujan con `node scripts/generar-portadas.mjs`; para usar una ilustración propia basta con
 * reemplazar el PNG con el mismo nombre. Una historia sin portada (por ejemplo una descargada
 * del catálogo) usa la portada geométrica por región.
 */
export const PORTADAS: Record<string, number> = {
  'alacran-fray-gomez': require('../../assets/portadas/alacran-fray-gomez.png'),
  'alma-de-fray-venancio': require('../../assets/portadas/alma-de-fray-venancio.png'),
  'caballero-carmelo': require('../../assets/portadas/caballero-carmelo.png'),
  'chullachaqui': require('../../assets/portadas/chullachaqui.png'),
  'duendes-del-cuzco': require('../../assets/portadas/duendes-del-cuzco.png'),
  'gama-ciega': require('../../assets/portadas/gama-ciega.png'),
  'hermanos-ayar': require('../../assets/portadas/hermanos-ayar.png'),
  'justicia-mayor-laycacota': require('../../assets/portadas/justicia-mayor-laycacota.png'),
  'lago-titicaca': require('../../assets/portadas/lago-titicaca.png'),
  'loro-pelado': require('../../assets/portadas/loro-pelado.png'),
  'manco-capac': require('../../assets/portadas/manco-capac.png'),
  'medias-de-los-flamencos': require('../../assets/portadas/medias-de-los-flamencos.png'),
  'naylamp': require('../../assets/portadas/naylamp.png'),
  'oficiosidad-no-agradecida': require('../../assets/portadas/oficiosidad-no-agradecida.png'),
  'polvos-de-la-condesa': require('../../assets/portadas/polvos-de-la-condesa.png'),
  'tortuga-gigante': require('../../assets/portadas/tortuga-gigante.png'),
  'yacumama': require('../../assets/portadas/yacumama.png'),
  'zorro-al-cielo': require('../../assets/portadas/zorro-al-cielo.png'),
  'zorro-y-condor': require('../../assets/portadas/zorro-y-condor.png'),
};
