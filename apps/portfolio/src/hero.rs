use leptos::prelude::*;

#[component]
pub fn Hero() -> impl IntoView {
    view! {
        <section class="hero" aria-labelledby="brand">
            <div class="hero__atmosphere" aria-hidden="true">
                <div class="hero__ridge hero__ridge--back"></div>
                <div class="hero__ridge hero__ridge--mid"></div>
                <div class="hero__ridge hero__ridge--front"></div>
                <div class="hero__grain"></div>
            </div>

            <div class="hero__content">
                <p class="hero__brand" id="brand">
                    "AlpineCraft"
                </p>
                <h1 class="hero__headline">
                    "Lean web software,"
                    <span class="hero__headline-em">" built with AI."</span>
                </h1>
                <p class="hero__sub">
                    "Fewer dependencies. Faster pages. Software that earns its bytes."
                </p>
                <div class="hero__cta">
                    <a class="btn btn--primary" href="/monvino/">
                        "See Mon Vino"
                    </a>
                    <a class="btn btn--ghost" href="#principles">
                        "Principles"
                    </a>
                </div>
            </div>
        </section>
    }
}
