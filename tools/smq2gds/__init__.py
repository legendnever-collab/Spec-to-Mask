"""smq2gds — turn SPEC-to-MASK Quest design-intent JSON (schema smq-design/1) into GDS and simulation decks.

Tool-neutral on purpose: the JSON is the contract; gdsfactory is one backend (an IPKISS backend can read the same file).
"""
__version__ = "0.1.0"
SCHEMA = "smq-design/1"
