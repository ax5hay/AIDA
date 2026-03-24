declare module "jstat" {
  const jStat: {
    centralF: { cdf: (x: number, df1: number, df2: number) => number };
    chisquare: { cdf: (x: number, dof: number) => number };
  };
  export default jStat;
}
