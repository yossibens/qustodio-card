class QustodioAppsCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;

    const entityId = this.config.entity;
    const quotaEntityId = this.config.quota_entity;

    const entity = hass.states[entityId];
    const quotaEntity = quotaEntityId ? hass.states[quotaEntityId] : null;

    if (!entity) return;

    // Clé optimisée par chaîne de caractères avec conservation de la langue (sécurité reconnexions HA)
    const key = `${entity.state}_${entity.attributes.time_used_minutes}_${entity.attributes.top_app}_${quotaEntity?.state || ''}_${hass.language}`;

    if (this._key === key) return;
    this._key = key;

    this._state = { entity, quotaEntity };

    this._render();
  }

  _addTime(child, minutes) {
    this._hass.callService('script', 'qustodio_add_extra_time_bonus', {
      enfant: child,
      minutes: Number(minutes) || 0
    });
  }

  _stopTime(child) {
    // Remet le bonus de temps extra à zéro.
    // Adaptez le nom du script/service ci-dessous si besoin.
    this._hass.callService('script', 'qustodio_reset_extra_time_bonus', {
      enfant: child
    });
  }

  _render() {
    if (!this._state) return;

    const entity = this._state.entity;
    const quotaEntity = this._state.quotaEntity;

    const childName = this.config.entity.split('.')[1];

    const quota = quotaEntity && !isNaN(parseFloat(quotaEntity.state))
      ? parseFloat(quotaEntity.state)
      : (entity.attributes.quota_minutes || 0);

    const apps = Array.isArray(entity.attributes.apps)
      ? entity.attributes.apps
      : [];

    const timeUsed = entity.attributes.time_used_minutes || 0;
    const remaining = Math.max(0, quota - timeUsed);

    const pct = quota > 0
      ? Math.min(100, Math.round((timeUsed / quota) * 100))
      : 0;

    const pctColor =
      pct >= 100 ? '#E24B4A' :
      pct >= 80 ? '#EF9F27' :
      '#1D9E75';

    const topApp = entity.attributes.top_app || '';
    const name = this.config.name || entity.attributes.friendly_name || 'Apps';

    // ================= TRADUCTIONS =================
    let lang = 'en';
    if (this._hass?.language) {
      if (this._hass.language.startsWith('fr')) lang = 'fr';
      else if (this._hass.language.startsWith('es')) lang = 'es';
      else if (this._hass.language.startsWith('de')) lang = 'de';
    }

    const t = {
      fr: {
        quota: "Quota",
        used: "Utilisé",
        remaining: "Restant",
        addTime: "Ajouter du temps :",
        stop: "STOP",
        stopTitle: "Remettre le bonus à zéro",
        noApps: "Aucune application utilisée aujourd'hui",
        min: "min",
        h30: "1h30",
        h00: "2h00"
      },
      en: {
        quota: "Quota",
        used: "Used",
        remaining: "Remaining",
        addTime: "Add extra time:",
        stop: "STOP",
        stopTitle: "Reset bonus to zero",
        noApps: "No applications used today",
        min: "min",
        h30: "1h30",
        h00: "2h00"
      },
      es: {
        quota: "Cuota",
        used: "Usado",
        remaining: "Restante",
        addTime: "Añadir tiempo:",
        stop: "STOP",
        stopTitle: "Restablecer el bono a cero",
        noApps: "No se usaron aplicaciones hoy",
        min: "min",
        h30: "1h30",
        h00: "2h00"
      },
      de: {
        quota: "Kontingent",
        used: "Genutzt",
        remaining: "Verbleibend",
        addTime: "Zeit hinzufügen:",
        stop: "STOP",
        stopTitle: "Bonus auf Null zurücksetzen",
        noApps: "Heute aucune application utilisée",
        min: "Min",
        h30: "1h30",
        h00: "2h00"
      }
    }[lang];

    const appsHtml = apps.length
      ? apps.map(app => {
          const hasThumb = !!app.thumbnail;
          const isTop = app.name === topApp;
          const barW = timeUsed ? Math.round(app.minutes / timeUsed * 100) : 0;

          const mediaHtml = hasThumb 
            ? `<img src="${app.thumbnail}" style="width:32px;height:32px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:32px;height:32px;border-radius:8px;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">📱</div>`;

          return `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0">
              ${mediaHtml}
              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:${isTop ? 600 : 400}">
                    ${app.name}
                  </span>
                  <span style="font-size:12px;color:#666;font-weight:${isTop ? 600 : 400}">
                    ${app.minutes} ${t.min}
                  </span>
                </div>

                <div style="height:4px;border-radius:2px;background:var(--card-background-color);overflow:hidden">
                  <div style="height:100%;width:${barW}%;background:${isTop ? 'var(--primary-color)' : 'var(--info-color)'}"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')
      : `<p style="text-align:center;color:#888">${t.noApps}</p>`;

    this.innerHTML = `
      <ha-card>
        <div style="padding:16px">

          <div style="font-size:15px;font-weight:500;margin-bottom:12px">
            ${name}
          </div>

          <div style="display:flex;gap:8px;margin-bottom:14px">
            <div style="flex:1;text-align:center;background:var(--card-background-color);border-radius:10px;padding:10px">
              <div style="font-size:11px;color:#888">${t.quota}</div>
              <div style="font-size:20px;font-weight:600;color:#1D9E75">
                ${Math.round(quota)} ${t.min}
              </div>
            </div>

            <div style="flex:1;text-align:center;background:var(--card-background-color);border-radius:10px;padding:10px">
              <div style="font-size:11px;color:#888">${t.used}</div>
              <div style="font-size:20px;font-weight:600;color:#333">
                ${Math.round(timeUsed)} ${t.min}
              </div>
            </div>

            <div style="flex:1;text-align:center;background:var(--card-background-color);border-radius:10px;padding:10px">
              <div style="font-size:11px;color:#888">${t.remaining}</div>
              <div style="font-size:20px;font-weight:600;color:#E24B4A">
                ${Math.round(remaining)} ${t.min}
              </div>
            </div>
          </div>

          <div style="height:4px;background:var(--card-background-color);border-radius:8px;margin-bottom:16px">
            <div style="height:100%;width:${pct}%;background:${pctColor};border-radius:8px"></div>
          </div>

          <div style="display:flex;gap:10px;align-items:center;margin-bottom:16px;background:var(--card-background-color);padding:8px 12px;border-radius:10px">
            <span style="font-size:13px;font-weight:500;flex:1">${t.addTime}</span>
            
            <select id="time-selector" style="padding:6px 10px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:var(--paper-card-background-color,#fff);color:var(--primary-text-color);font-size:13px;font-weight:600;outline:none;cursor:pointer;">
              <option value="10">10 ${t.min}</option>
              <option value="20">20 ${t.min}</option>
              <option value="30" selected>30 ${t.min}</option>
              <option value="40">40 ${t.min}</option>
              <option value="50">50 ${t.min}</option>
              <option value="60">60 ${t.min}</option>
              <option value="90">${t.h30}</option>
              <option value="120">${t.h00}</option>
            </select>

            <button id="btn-validate" style="display:flex;align-items:center;justify-content:center;background:var(--primary-color);border:none;border-radius:6px;padding:6px 12px;cursor:pointer;outline:none;">
              <ha-icon icon="mdi:plus" style="color:white;--mdc-icon-size:20px;"></ha-icon>
            </button>

            <button id="btn-stop" title="${t.stopTitle}" style="display:flex;align-items:center;justify-content:center;gap:4px;background:#E24B4A;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;outline:none;">
              <ha-icon icon="mdi:stop" style="color:white;--mdc-icon-size:18px;"></ha-icon>
              <span style="color:white;font-size:12px;font-weight:600;">${t.stop}</span>
            </button>
          </div>

          ${appsHtml}
        </div>
      </ha-card>
    `;

    const select = this.querySelector('#time-selector');
    const btn = this.querySelector('#btn-validate');
    const btnStop = this.querySelector('#btn-stop');

    if (btn && select) {
      btn.onclick = () => {
        this._addTime(childName, select.value);
      };
    }

    if (btnStop) {
      btnStop.onclick = () => {
        this._stopTime(childName);
      };
    }
  }

  getCardSize() { return 5; }
}

customElements.define('qustodio-apps-card', QustodioAppsCard);
