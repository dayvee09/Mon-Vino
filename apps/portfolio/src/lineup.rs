use leptos::prelude::*;

#[component]
pub fn Lineup() -> impl IntoView {
    view! {
        <section class="lineup" id="lineup" aria-labelledby="lineup-heading">
            <div class="section-inner">
                <p class="section-kicker">"01 / The lineup"</p>
                <h2 class="section-title" id="lineup-heading">
                    "Real products. Less waste."
                </h2>
                <p class="section-lead">
                    "Shipped software first. Speculative decks never."
                </p>

                <ul class="lineup__list">
                    <li class="project project--featured reveal">
                        <div class="project__meta">
                            <span class="project__status">"Live"</span>
                            <span class="project__index">"01"</span>
                        </div>
                        <h3 class="project__name">"Mon Vino"</h3>
                        <p class="project__blurb">
                            "Cellar management — React, PHP, MariaDB, Cognito — deployed and real."
                        </p>
                        <ul class="project__stack" aria-label="Stack">
                            <li>"React"</li>
                            <li>"PHP"</li>
                            <li>"MariaDB"</li>
                            <li>"Cognito"</li>
                        </ul>
                        <a class="project__link" href="/monvino/">
                            "Open app"
                            <span aria-hidden="true">" →"</span>
                        </a>
                    </li>

                    <li class="project project--next reveal" aria-label="Upcoming project">
                        <div class="project__meta">
                            <span class="project__status project__status--muted">"Next"</span>
                            <span class="project__index">"02"</span>
                        </div>
                        <h3 class="project__name">"Next craft"</h3>
                        <p class="project__blurb">
                            "Another lean build is on the bench. Watch this space."
                        </p>
                    </li>
                </ul>
            </div>
        </section>
    }
}
