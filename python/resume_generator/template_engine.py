"""HTML and markdown template rendering."""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


def get_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )


def render_resume_html(context: dict) -> str:
    return get_env().get_template("resume.html").render(**context)


def render_resume_md(context: dict) -> str:
    return get_env().get_template("resume.md.j2").render(**context)


def render_cover_letter_md(context: dict) -> str:
    return get_env().get_template("cover_letter.md.j2").render(**context)


def render_cover_letter_html(context: dict) -> str:
    return get_env().get_template("cover_letter.html").render(**context)
