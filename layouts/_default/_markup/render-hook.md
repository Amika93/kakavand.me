{{ $content := .Inner }}

{{/* Replace [[WikiLinks]] syntax with proper markdown links */}}
{{ $regex := "\\[\\[([^\\]\\|]+)(?:\\|([^\\]]+))?\\]\\]" }}
{{ $replacement := "[${2:-$1}](/${1})" }}
{{ $content = replaceRE $regex $replacement $content }}

{{ return $content | markdownify }} 