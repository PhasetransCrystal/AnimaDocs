import {contributors} from "@site/src/data/contibutors";

export type Contributor = {
    name: string;//Frontier show name;
    github: string;//GitHub id, trans to https://github.com/id
    describe: string;
    background?: null | string | { night: string, day: string }//背景图预留，暂不启用
}

export type ResolvedContributor = Contributor & {
    id: string;
    icon: string;
    url: string;
}

//将文档内元素转换为作者列表
export function extractContributorId(value: unknown, docId?: string): string[]{
    if(value === undefined || value === null) return [];

    //支持单作者或作者列
    const name = Array.isArray(value) ? value : [value];

    return name.map((id,index) => {
        if(typeof id === "string" && id.trim() !== "") return id;
        throw new Error(`[ContributorComponent]An unexpected object at authors[${index}] ${docId ? `in page(${docId})` : ""}, a non-empty string is required.`)
    })
}

export function buildContributors(value: unknown, docId?: string) : ResolvedContributor[]{
    return extractContributorId(value, docId).map(id => {
        const c :Contributor = contributors[id];
        if(!c) throw new Error(`[ContributorComponent]Can't find author(${id}) ${docId ? `in page(${docId})` : ""} from authors list.Did you forget to add your name to \\website\\src\\data\\contibutors.ts ?`)
        return {id, ...c, icon: `https://github.com/${encodeURIComponent(c.github)}.png?size=160`, url: `https://github.com/${encodeURIComponent(c.github)}`};
    })
}

//作者总览页调用
export function allContributors4Overview(): ResolvedContributor[]{
    return Object.entries(contributors).map(([id,c]) => {
        return {id, ...c, icon: `https://github.com/${encodeURIComponent(c.github)}.png?size=160`, url: `https://github.com/${encodeURIComponent(c.github)}`}
    })
}