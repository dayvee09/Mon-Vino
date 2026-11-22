mod footer;
mod hero;
mod lineup;
mod principles;

use leptos::prelude::*;

fn main() {
    console_error_panic_hook::set_once();
    mount_to_body(|| {
        view! {
            <App />
        }
    })
}

#[component]
fn App() -> impl IntoView {
    view! {
        <a class="skip-link" href="#lineup">
            "Skip to projects"
        </a>
        <main class="site">
            <hero::Hero />
            <lineup::Lineup />
            <principles::Principles />
            <footer::SiteFooter />
        </main>
    }
}
