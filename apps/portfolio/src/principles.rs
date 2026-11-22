use leptos::prelude::*;

#[component]
pub fn Principles() -> impl IntoView {
    view! {
        <section class="principles" id="principles" aria-labelledby="principles-heading">
            <div class="section-inner">
                <p class="section-kicker">"02 / Principles"</p>
                <h2 class="section-title" id="principles-heading">
                    "How the work gets made."
                </h2>

                <ol class="principles__list">
                    <li class="principle reveal">
                        <span class="principle__num">"01"</span>
                        <div>
                            <h3 class="principle__title">"Efficiency first"</h3>
                            <p class="principle__body">
                                "Measure payload, not just features. Every byte should justify itself."
                            </p>
                        </div>
                    </li>
                    <li class="principle reveal">
                        <span class="principle__num">"02"</span>
                        <div>
                            <h3 class="principle__title">"AI as leverage"</h3>
                            <p class="principle__body">
                                "Agents accelerate craft; humans own taste and architecture."
                            </p>
                        </div>
                    </li>
                    <li class="principle reveal">
                        <span class="principle__num">"03"</span>
                        <div>
                            <h3 class="principle__title">"Ship real products"</h3>
                            <p class="principle__body">
                                "Mon Vino is live, not a mock. Proof beats pitch."
                            </p>
                        </div>
                    </li>
                    <li class="principle reveal">
                        <span class="principle__num">"04"</span>
                        <div>
                            <h3 class="principle__title">"Own the stack"</h3>
                            <p class="principle__body">
                                "Prefer small, intentional surfaces over framework sprawl. This site runs as Rust → WASM."
                            </p>
                        </div>
                    </li>
                </ol>
            </div>
        </section>
    }
}
