# CSS (S-sulfo-L-cysteine) serum concentration and cancer-therapy-related
# cardiotoxicity (CTCR): exploratory prediction-model analysis
# R >= 4.3. All results are printed to the console. No figures.
#
# Design notes
#   1. Outcome = Cardiotoxicity (1 = CTCR, 0 = Non-CTCR).
#   2. LVEF_follow and dLVEF (= LVEF_base - LVEF_follow) define the outcome and
#      are excluded from all models (leakage). Only baseline variables are used.
#   3. With 20 events the multivariable model is restricted to 2 predictors.
#      Firth penalised logistic regression (logistf) is used because CSS almost
#      completely separates the groups.
#   4. Internal validation: bootstrap optimism correction (B = 500).

# ---------------------------------------------------------------- packages ----
pkgs <- c("readxl", "dplyr", "tidyr", "tableone", "pROC", "logistf", "glmnet",
          "dcurves", "pmsampsize")
for (p in pkgs) if (!requireNamespace(p, quietly = TRUE)) install.packages(p)
suppressPackageStartupMessages({
  library(readxl); library(dplyr); library(tableone); library(pROC)
  library(logistf); library(glmnet); library(dcurves); library(pmsampsize)
})
set.seed(20260924)
options(width = 160)

# ------------------------------------------------------------------- data ----
file_path <- "20260908.xlsx"   # change to the local path of the uploaded file

read_grp <- function(sheet) {
  d <- read_excel(file_path, sheet = sheet)
  # rename by position: sheet column order is fixed
  names(d) <- c("MAFLD", "LVEF_base", "LVEF_follow", "dLVEF", "Cardiotoxicity",
                "ALT", "AST", "TBA", "TG", "TC", "HDL", "LDL", "Glucose", "TyG",
                "UA", "PLT", "BMI", "FIB4", "patient", "CSS")
  d$group <- sheet
  d
}
dat <- bind_rows(read_grp("CTCR"), read_grp("Non-CTCR")) %>%
  mutate(across(c(MAFLD, LVEF_base, LVEF_follow, dLVEF, Cardiotoxicity, ALT,
                  AST, TBA, TG, TC, HDL, LDL, Glucose, TyG, UA, PLT, BMI,
                  FIB4, CSS), as.numeric),
         patient = sub("^10xdilution_", "", patient),
         logCSS  = log(CSS),
         CSS_high = as.integer(CSS > 10))

cat("\n==================== 1. DATA CHECKS ====================\n")
cat("n =", nrow(dat), " events =", sum(dat$Cardiotoxicity), "\n")
cat("\nMissing values per variable:\n")
print(colSums(is.na(dat)))

cat("\nCheck dLVEF == LVEF_base - LVEF_follow:\n")
print(table(dat$dLVEF == dat$LVEF_base - dat$LVEF_follow, useNA = "ifany"))
cat("\nOutcome vs dLVEF >= 10 (shows that dLVEF defines the outcome):\n")
print(table(Cardiotoxicity = dat$Cardiotoxicity, dLVEF_ge10 = dat$dLVEF >= 10))

clin_vars <- c("MAFLD", "ALT", "AST", "TBA", "TG", "TC", "HDL", "LDL",
               "Glucose", "TyG", "UA", "PLT")
cat("\nPatients with identical laboratory profiles (possible duplicates):\n")
key <- apply(dat[, clin_vars], 1, paste, collapse = "|")
dup_keys <- unique(key[duplicated(key)])
if (length(dup_keys) == 0) cat("none\n") else {
  for (k in dup_keys) print(dat[key == k, c("patient", "group", "LVEF_base",
                                            "BMI", "CSS", clin_vars)],
                            n = Inf, width = Inf)
}

cat("\nCSS by group:\n")
print(dat %>% group_by(group) %>%
        summarise(n = n(), median = median(CSS), q1 = quantile(CSS, .25),
                  q3 = quantile(CSS, .75), min = min(CSS), max = max(CSS)))
cat("\nCSS > 10 ug/mL by group:\n")
print(table(group = dat$group, CSS_gt10 = dat$CSS > 10))

# ----------------------------------------------------- 2. baseline table ----
cat("\n==================== 2. BASELINE TABLE BY OUTCOME ====================\n")
cont_vars <- c("LVEF_base", "ALT", "AST", "TBA", "TG", "TC", "HDL", "LDL",
               "Glucose", "TyG", "UA", "PLT", "BMI", "CSS")
tab1 <- CreateTableOne(vars = c(cont_vars, "MAFLD", "FIB4"),
                       strata = "Cardiotoxicity", data = dat,
                       factorVars = c("MAFLD", "FIB4"))
print(tab1, nonnormal = cont_vars, exact = c("MAFLD", "FIB4"),
      showAllLevels = TRUE, smd = TRUE)

# ------------------------------------------------ 3. CSS alone: ROC ----
cat("\n==================== 3. CSS ALONE: ROC ====================\n")
roc_css <- roc(dat$Cardiotoxicity, dat$CSS, direction = "<", quiet = TRUE)
cat("AUC (DeLong 95% CI):\n"); print(ci.auc(roc_css))
cat("\nYouden-optimal threshold with bootstrap 95% CI (2000 reps):\n")
print(coords(roc_css, "best", best.method = "youden",
             ret = c("threshold", "sensitivity", "specificity", "ppv", "npv")))
print(ci.coords(roc_css, "best", best.method = "youden",
                ret = c("threshold", "sensitivity", "specificity"),
                boot.n = 2000))
cat("\nPerformance at fixed threshold CSS > 10 ug/mL:\n")
print(coords(roc_css, 10, input = "threshold",
             ret = c("threshold", "sensitivity", "specificity", "ppv", "npv",
                     "accuracy")))
cat("\nFisher exact test, CSS > 10 vs outcome:\n")
print(fisher.test(table(dat$CSS_high, dat$Cardiotoxicity)))

# ------------------------------------------- 4. univariable Firth ----
cat("\n==================== 4. UNIVARIABLE FIRTH LOGISTIC ====================\n")
uni_vars <- c("logCSS", "CSS_high", "MAFLD", "LVEF_base", "ALT", "AST", "TBA",
              "TG", "TC", "HDL", "LDL", "Glucose", "TyG", "UA", "PLT", "BMI",
              "FIB4")
uni <- lapply(uni_vars, function(v) {
  d <- dat[!is.na(dat[[v]]), ]
  f <- logistf(as.formula(paste("Cardiotoxicity ~", v)), data = d)
  data.frame(variable = v, n = nrow(d),
             OR = exp(coef(f)[2]), lower = exp(f$ci.lower[2]),
             upper = exp(f$ci.upper[2]), p = f$prob[2], row.names = NULL)
})
uni <- bind_rows(uni)
print(uni, digits = 3)

# ----------------------------------- 5. pre-specified 2-variable model ----
cat("\n==================== 5. MULTIVARIABLE FIRTH MODEL: logCSS + BMI ====================\n")
form_main <- Cardiotoxicity ~ logCSS + BMI
fit_main  <- logistf(form_main, data = dat)
print(summary(fit_main))
cat("\nOdds ratios with 95% profile-likelihood CI:\n")
print(data.frame(OR = exp(coef(fit_main)), lower = exp(fit_main$ci.lower),
                 upper = exp(fit_main$ci.upper), p = fit_main$prob), digits = 3)

lp_of <- function(fit, newdata) {
  X <- model.matrix(fit$formula[-2], newdata)   # drop response side
  as.vector(X %*% coef(fit))
}
dat$lp_main <- lp_of(fit_main, dat)
dat$p_main  <- plogis(dat$lp_main)

roc_main <- roc(dat$Cardiotoxicity, dat$lp_main, direction = "<", quiet = TRUE)
cat("\nApparent AUC (DeLong 95% CI):\n"); print(ci.auc(roc_main))
cat("\nDeLong test, logCSS + BMI vs CSS alone:\n")
print(roc.test(roc_main, roc_css, method = "delong"))
cat("\nBrier score:", round(mean((dat$p_main - dat$Cardiotoxicity)^2), 4), "\n")

# ---------------------------------------- 6. bootstrap internal validation ----
cat("\n==================== 6. BOOTSTRAP OPTIMISM CORRECTION (B = 500) ====================\n")
cal_slope <- function(y, lp) {
  g <- suppressWarnings(glm(y ~ lp, family = binomial))
  unname(coef(g)[2])
}
boot_validate <- function(formula, data, B = 500) {
  fit0 <- logistf(formula, data = data)
  lp0  <- lp_of(fit0, data)
  auc_app   <- as.numeric(auc(roc(data$Cardiotoxicity, lp0, direction = "<", quiet = TRUE)))
  slope_app <- cal_slope(data$Cardiotoxicity, lp0)
  opt <- t(replicate(B, {
    idx <- sample(nrow(data), replace = TRUE)
    d   <- data[idx, ]
    fb  <- tryCatch(logistf(formula, data = d), error = function(e) NULL)
    if (is.null(fb)) return(c(NA, NA))
    lp_b <- lp_of(fb, d); lp_o <- lp_of(fb, data)
    auc_b <- as.numeric(auc(roc(d$Cardiotoxicity, lp_b, direction = "<", quiet = TRUE)))
    auc_o <- as.numeric(auc(roc(data$Cardiotoxicity, lp_o, direction = "<", quiet = TRUE)))
    c(auc_b - auc_o, cal_slope(d$Cardiotoxicity, lp_b) - cal_slope(data$Cardiotoxicity, lp_o))
  }))
  opt <- opt[complete.cases(opt), , drop = FALSE]
  data.frame(metric = c("AUC", "calibration slope"),
             apparent = c(auc_app, slope_app),
             optimism = colMeans(opt),
             corrected = c(auc_app, slope_app) - colMeans(opt),
             boot_used = nrow(opt))
}
print(boot_validate(form_main, dat), digits = 3)

cat("\nCalibration-in-the-large (mean predicted vs observed):\n")
cat("mean predicted =", round(mean(dat$p_main), 3),
    " observed =", round(mean(dat$Cardiotoxicity), 3), "\n")
cat("\nObserved vs predicted by tertile of predicted risk:\n")
print(dat %>% mutate(tert = ntile(p_main, 3)) %>% group_by(tert) %>%
        summarise(n = n(), mean_pred = mean(p_main), obs = mean(Cardiotoxicity)))

# ------------------------------------------- 7. LASSO (exploratory) ----
cat("\n==================== 7. LASSO, LEAVE-ONE-OUT CV (EXPLORATORY) ====================\n")
lasso_vars <- c("logCSS", "MAFLD", "LVEF_base", "ALT", "AST", "TBA", "TG", "TC",
                "HDL", "LDL", "Glucose", "TyG", "UA", "PLT", "BMI", "FIB4")
dcc <- dat[complete.cases(dat[, lasso_vars]), ]
cat("complete cases used:", nrow(dcc), " events:", sum(dcc$Cardiotoxicity), "\n")
X <- as.matrix(dcc[, lasso_vars]); y <- dcc$Cardiotoxicity
cv <- cv.glmnet(X, y, family = "binomial", alpha = 1, nfolds = nrow(dcc),
                grouped = FALSE, type.measure = "deviance")
cat("lambda.min =", signif(cv$lambda.min, 4), " lambda.1se =", signif(cv$lambda.1se, 4), "\n")
cat("\nNon-zero coefficients at lambda.1se:\n")
b1 <- coef(cv, s = "lambda.1se"); print(b1[b1[, 1] != 0, , drop = FALSE])
cat("\nNon-zero coefficients at lambda.min:\n")
b2 <- coef(cv, s = "lambda.min"); print(b2[b2[, 1] != 0, , drop = FALSE])

# ------------------------------------------------ 8. decision curve ----
cat("\n==================== 8. DECISION CURVE: NET BENEFIT TABLE ====================\n")
dat$p_css <- plogis(lp_of(logistf(Cardiotoxicity ~ logCSS, data = dat), dat))
dca_res <- dca(Cardiotoxicity ~ p_css + p_main, data = dat,
               thresholds = seq(0.1, 0.8, by = 0.1),
               label = list(p_css = "logCSS only", p_main = "logCSS + BMI"))
print(as_tibble(dca_res) %>%
        select(label, threshold, net_benefit) %>%
        tidyr::pivot_wider(names_from = label, values_from = net_benefit),
      n = Inf, width = Inf)

# ---------------------------------------------- 9. required sample size ----
cat("\n==================== 9. SAMPLE SIZE REQUIRED FOR A 2-PREDICTOR MODEL ====================\n")
cat("Riley et al. criteria, prevalence 0.45, anticipated C-statistic 0.85:\n")
print(pmsampsize(type = "b", cstatistic = 0.85, parameters = 2, prevalence = 0.45))

cat("\nDone.\n")
