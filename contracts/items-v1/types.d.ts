// Generated from schema.json by build.mjs. Do not edit.
export type Hash = string;
export type Commit = string;
export type Version = "items-v1";
export type State = "success" | "missing";
export type File = { "path": string; "sha256": Hash; "bytes": number };
export type Pointer = { "formatVersion": Version; "dataVersion": Hash; "manifest": File };
export type Contract = { "sourceCommit": Commit; "sha256": Hash };
export type Producer = { "name": "latale-wiki-data"; "commit": Commit; "inputSha256": Hash; "scope": "historical-sqlite-back-half-only" };
export type Coverage = { "kind": "full-public" | "producer-test-subset"; "count": number; "fullPublicCount": number; "selection": Array<string> };
export type Manifest = { "formatVersion": Version; "dataVersion": Hash; "contract": Contract; "producer": Producer; "coverage": Coverage; "items": File };
export type Description = { "status": "success" | "missing"; "value": string };
export type Segment = { "key": string; "label": string | null; "status": State };
export type Category = { "status": State; "segments": Array<Segment>; "continuation": "unresolved" | "native_label_rule_end" };
export type Item = { "id": string; "name": string; "description": Description; "category": Category };
export type Items = { "formatVersion": Version; "items": Array<Item> };
