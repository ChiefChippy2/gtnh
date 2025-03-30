declare module 'javascript-lp-solver' {
    export interface Model {
        optimize: string;
        opType: 'min' | 'max';
        constraints: {
            [key: string]: {
                min?: number;
                max?: number;
                equal?: number;
            };
        };
        variables: {
            [key: string]: {
                [key: string]: number;
            };
        };
    }

    export interface Solution {
        feasible: boolean;
        result: number;
        [key: string]: number | boolean;
    }

    export function Solve(model: Model): Solution;
} 