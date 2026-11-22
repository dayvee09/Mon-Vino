use leptos::prelude::*;

#[component]
pub fn SiteFooter() -> impl IntoView {
    view! {
        <footer class="site-footer">
            <div class="section-inner site-footer__inner">
                <p class="site-footer__brand">"AlpineCraft"</p>
                <p class="site-footer__note">
                    "Portfolio compiled from Rust to WebAssembly."
                </p>
                <p class="site-footer__links">
                    <a href="https://alpinecraft.cc">"alpinecraft.cc"</a>
                    <span aria-hidden="true">" · "</span>
                    <a href="/monvino/">"Mon Vino"</a>
                </p>
            </div>
        </footer>
    }
}
