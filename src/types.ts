export interface PageDoc {
  url: string;
  title: string;
  text: string;
}

export interface Chunk {
  id: string;
  url: string;
  title: string;
  text: string;
  embedding: number[];
}

export interface Source {
  url: string;
  title: string;
  score: number;
}
