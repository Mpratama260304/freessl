"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileKey2,
  FileText,
  Globe2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RotateCcw,
  Server,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassBadge } from "@/components/ui/glass-badge";
import { GlassProgress } from "@/components/ui/glass-progress";
import {
  CopyButton,
  DownloadButton,
  ErrorMessage,
  TechnicalValue,
  downloadFile,
} from "@/components/common";
import { hasWildcard, parseDomains } from "@/lib/validation/domains";
import { postJson, ApiFailure } from "@/lib/client-api";
import type {
  KeyType,
  OrderView,
  ValidationMethod,
} from "@/lib/certificates/types";
import { certificateBundle } from "@/lib/certificates/bundle";

const steps = [
  "Domains",
  "Validation",
  "Verification",
  "Issue certificate",
  "Download",
];

export function Generator({
  initialDomain = "",
  initialMethod = "dns-01",
  maximum,
  environment,
}: {
  initialDomain?: string;
  initialMethod?: ValidationMethod;
  maximum: number;
  environment: "staging" | "production";
}) {
  const [domains, setDomains] = useState([{ id: 0, value: initialDomain }]);
  const nextId = useRef(1);
  const [method, setMethod] = useState<ValidationMethod>(initialMethod);
  const [keyType, setKeyType] = useState<KeyType>("ec256");
  const [step, setStep] = useState(0);
  const [terms, setTerms] = useState(false);
  const [order, setOrder] = useState<OrderView | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isExpired, setExpired] = useState(false);
  const [pollPaused, setPollPaused] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const orderId = order?.id;
  const orderStatus = order?.status;
  const expiresAt = order?.expiresAt;
  const wildcard = hasWildcard(domains.map((domain) => domain.value.trim()));
  const selectedMethod = wildcard ? "dns-01" : method;
  const activeStep = order
    ? order.status === "issued"
      ? 4
      : ["verifying", "issuing", "failed"].includes(order.status)
        ? 3
        : 2
    : step;

  useEffect(() => {
    if (!expiresAt || orderStatus === "issued") return;
    const expirationTime = expiresAt;
    function tick() {
      const left = Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
      setSecondsLeft(left);
      if (!left) setExpired(true);
    }
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, orderStatus]);

  useEffect(() => {
    if (
      !orderId ||
      !["verifying", "issuing"].includes(orderStatus ?? "") ||
      pollPaused ||
      isExpired
    )
      return;
    const id = orderId;
    const controller = new AbortController();
    let inFlight = false;
    let failures = 0;
    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try {
        const updated = await postJson<OrderView>(
          `/api/certificates/${id}/progress`,
          {},
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setOrder(updated);
          failures = 0;
          if (updated.status === "issued")
            toast.success("Certificate generated successfully");
        }
      } catch (failure) {
        if (controller.signal.aborted) return;
        if (failure instanceof ApiFailure && failure.code === "ORDER_EXPIRED")
          setExpired(true);
        else if (++failures >= 3) {
          setPollPaused(true);
          setError(
            "Automatic status checks paused after connection errors. You can retry below.",
          );
        }
      } finally {
        inFlight = false;
      }
    }
    const timer = setInterval(refresh, 3000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [orderId, orderStatus, pollPaused, isExpired]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (privateKey && !downloaded) event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [downloaded, privateKey]);

  function nextStep() {
    try {
      const normalized = parseDomains(
        domains.map((domain) => domain.value),
        maximum,
      );
      setDomains(normalized.map((value) => ({ id: nextId.current++, value })));
      setError("");
      setStep(1);
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function create() {
    if (busy) return;
    setError("");
    try {
      const normalized = parseDomains(
        domains.map((domain) => domain.value),
        maximum,
      );
      setBusy("Generating your private key in this browser...");
      const { createKeyMaterial } = await import("@/lib/crypto/browser");
      const material = await createKeyMaterial(normalized, keyType);
      setPrivateKey(material.privateKey);
      setBusy("Creating your order with Let's Encrypt...");
      const result = await postJson<OrderView>("/api/certificates", {
        domains: normalized,
        method: selectedMethod,
        keyType,
        csr: material.csr,
        acceptedTerms: terms,
      });
      setOrder(result);
      setSecondsLeft(
        Math.max(0, Math.floor((result.expiresAt - Date.now()) / 1000)),
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function action(actionName: "check" | "verify" | "progress") {
    if (!order || busy) return;
    setError("");
    setBusy(
      actionName === "check"
        ? "Checking public challenge records..."
        : actionName === "verify"
          ? "Asking Let's Encrypt to verify your domain..."
          : "Refreshing certificate status...",
    );
    try {
      const updated = await postJson<OrderView>(
        `/api/certificates/${order.id}/${actionName}`,
        {},
      );
      setOrder(updated);
      if (actionName === "check")
        toast[updated.status === "ready" ? "success" : "info"](
          updated.status === "ready"
            ? "All challenges detected"
            : "Some challenges are not ready yet",
        );
      if (actionName === "verify")
        toast.success("Let's Encrypt verification started");
      setPollPaused(false);
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.code === "ORDER_EXPIRED")
        setExpired(true);
      else setError((failure as Error).message);
    } finally {
      setBusy("");
    }
  }

  function reset() {
    setPrivateKey("");
    setOrder(null);
    setStep(0);
    setError("");
    setExpired(false);
    setPollPaused(false);
    setDownloaded(false);
    setSecondsLeft(null);
  }

  async function downloadZip() {
    if (!order?.certificate || !privateKey) return;
    const { zipSync, strToU8 } = await import("fflate");
    const files = certificateBundle(
      privateKey,
      order.certificate,
      environment === "staging",
    );
    downloadFile(
      "certificate.zip",
      zipSync(
        Object.fromEntries(
          Object.entries(files).map(([name, value]) => [name, strToU8(value)]),
        ),
      ),
    );
    setDownloaded(true);
  }

  return (
    <div className="generator-workspace">
      <ol
        className="wizard-stepper"
        aria-label="Certificate generation progress"
      >
        {steps.map((label, index) => (
          <li
            key={label}
            className={
              index === activeStep
                ? "active"
                : index < activeStep
                  ? "complete"
                  : ""
            }
            aria-current={index === activeStep ? "step" : undefined}
          >
            <span className="step-circle">
              {index < activeStep ? <Check size={16} /> : index + 1}
            </span>
            <span className="step-label">{label}</span>
          </li>
        ))}
      </ol>
      <GlassProgress
        value={(activeStep + 1) * 20}
        aria-label={`Step ${activeStep + 1} of 5: ${steps[activeStep]}`}
      />
      {environment === "staging" && (
        <div className="notice notice-warning staging-notice">
          <TriangleAlert size={18} />
          <p>
            <strong>Staging environment.</strong> Test certificates are real but
            are not trusted by browsers. Do not install them on a production
            website.
          </p>
        </div>
      )}
      <div className="wizard-layout">
        <div className="wizard-content" aria-busy={!!busy}>
          {isExpired ? (
            <div className="empty-state">
              <Clock3 size={38} />
              <h2>Certificate order expired</h2>
              <p>Start a new certificate request to continue.</p>
              <GlassButton variant="primary" onClick={reset}>
                <RotateCcw /> Create new order
              </GlassButton>
            </div>
          ) : (
            <>
              {activeStep === 0 && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    nextStep();
                  }}
                >
                  <div className="form-heading">
                    <span className="eyebrow">Step 01 / Your domains</span>
                    <h2>What would you like to secure?</h2>
                    <p>
                      Add a domain, a subdomain, or a wildcard. Up to {maximum}{" "}
                      domains per certificate.
                    </p>
                  </div>
                  <div className="domain-rows">
                    {domains.map((domain, index) => (
                      <div className="domain-row" key={domain.id}>
                        <div className="grow-field">
                          <label
                            htmlFor={`domain-${domain.id}`}
                            className="field-label"
                          >
                            {index === 0
                              ? "Domain name"
                              : `Additional domain ${index}`}
                          </label>
                          <GlassInput
                            id={`domain-${domain.id}`}
                            value={domain.value}
                            onChange={(event) =>
                              setDomains(
                                domains.map((row) =>
                                  row.id === domain.id
                                    ? { ...row, value: event.target.value }
                                    : row,
                                ),
                              )
                            }
                            placeholder={
                              index === 0 ? "example.com" : "www.example.com"
                            }
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            required
                            maxLength={2048}
                          />
                        </div>
                        {domains.length > 1 && (
                          <GlassButton
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove domain ${index + 1}`}
                            onClick={() =>
                              setDomains(
                                domains.filter((row) => row.id !== domain.id),
                              )
                            }
                          >
                            <Trash2 />
                          </GlassButton>
                        )}
                      </div>
                    ))}
                  </div>
                  <GlassButton
                    type="button"
                    variant="ghost"
                    className="add-domain"
                    disabled={domains.length >= maximum}
                    onClick={() =>
                      setDomains([
                        ...domains,
                        { id: nextId.current++, value: "" },
                      ])
                    }
                  >
                    <Plus /> Add another domain
                  </GlassButton>
                  {wildcard && (
                    <div className="notice notice-info">
                      <Globe2 size={18} />
                      <p>
                        Wildcard certificates require DNS validation. Add the
                        root domain separately to cover it too.
                      </p>
                    </div>
                  )}
                  <div className="form-actions">
                    <span className="text-muted small">
                      URLs are normalized to hostnames.
                    </span>
                    <GlassButton type="submit" variant="primary">
                      Continue <ArrowRight />
                    </GlassButton>
                  </div>
                </form>
              )}
              {activeStep === 1 && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void create();
                  }}
                >
                  <div className="form-heading">
                    <span className="eyebrow">
                      Step 02 / Ownership validation
                    </span>
                    <h2>Your domain. Your choice.</h2>
                    <p>
                      Choose how you want to prove you control these domains.
                    </p>
                  </div>
                  <fieldset className="validation-options">
                    <legend className="sr-only">Validation method</legend>
                    {(
                      [
                        [
                          "dns-01",
                          "DNS validation",
                          "Add a TXT record to your domain's DNS.",
                          Globe2,
                        ],
                        [
                          "http-01",
                          "HTTP validation",
                          "Upload a temporary file to your web server.",
                          Server,
                        ],
                      ] as const
                    ).map(([value, title, description, Icon]) => (
                      <label
                        key={value}
                        className={`validation-option ${selectedMethod === value ? "selected" : ""} ${wildcard && value === "http-01" ? "disabled" : ""}`}
                      >
                        <input
                          type="radio"
                          name="validation"
                          value={value}
                          checked={selectedMethod === value}
                          disabled={
                            busy !== "" || (wildcard && value === "http-01")
                          }
                          onChange={() => setMethod(value)}
                        />
                        <Icon size={24} />
                        <div>
                          <div className="option-title">
                            <h3>{title}</h3>
                            {value === "dns-01" && (
                              <GlassBadge size="sm" variant="success">
                                Recommended
                              </GlassBadge>
                            )}
                          </div>
                          <p>{description}</p>
                          <small>
                            {value === "dns-01"
                              ? "Supports wildcards. No website file changes."
                              : wildcard
                                ? "Unavailable for wildcard certificates."
                                : "Requires a publicly accessible HTTP server on port 80."}
                          </small>
                        </div>
                      </label>
                    ))}
                  </fieldset>
                  {wildcard && (
                    <p className="field-hint">
                      Wildcard certificates require DNS validation.
                    </p>
                  )}
                  <details className="advanced-options">
                    <summary>
                      Advanced options <KeyRound size={17} />
                    </summary>
                    <label htmlFor="key-type" className="field-label">
                      Certificate key type
                    </label>
                    <select
                      id="key-type"
                      value={keyType}
                      disabled={!!busy}
                      onChange={(event) =>
                        setKeyType(event.target.value as KeyType)
                      }
                    >
                      <option value="ec256">ECDSA P-256 (recommended)</option>
                      <option value="rsa2048">RSA 2048</option>
                    </select>
                    <p className="field-hint">
                      ECDSA uses smaller keys. Choose RSA for older server
                      compatibility.
                    </p>
                  </details>
                  <label className="terms-check">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(event) => setTerms(event.target.checked)}
                      required
                      disabled={!!busy}
                    />
                    <span>
                      I control these domains or am authorized to manage them. I
                      accept the{" "}
                      <Link href="/terms" target="_blank">
                        terms
                      </Link>{" "}
                      and{" "}
                      <a
                        href="https://letsencrypt.org/repository/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Let&apos;s Encrypt subscriber agreement
                      </a>
                      .
                    </span>
                  </label>
                  <div className="form-actions">
                    <GlassButton
                      type="button"
                      variant="ghost"
                      disabled={!!busy}
                      onClick={() => setStep(0)}
                    >
                      <ArrowLeft /> Back
                    </GlassButton>
                    <GlassButton
                      type="submit"
                      variant="primary"
                      disabled={!terms || !!busy}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" />
                      ) : (
                        <LockKeyhole />
                      )}{" "}
                      Generate SSL certificate
                    </GlassButton>
                  </div>
                </form>
              )}
              {activeStep === 2 && order && (
                <>
                  <div className="form-heading">
                    <span className="eyebrow">Step 03 / Prove ownership</span>
                    <h2>
                      {order.method === "dns-01"
                        ? "Add your DNS records."
                        : "Upload your challenge files."}
                    </h2>
                    <p>
                      {order.method === "dns-01"
                        ? "Create the following TXT records with your DNS provider. If names repeat, keep every value as a separate TXT record."
                        : "Place each file in /.well-known/acme-challenge/ on the corresponding web server. Its URL must be publicly accessible on port 80."}
                    </p>
                  </div>
                  <div className="challenge-list">
                    {order.challenges.map((challenge) => (
                      <article className="challenge-card" key={challenge.id}>
                        <div className="challenge-heading">
                          <h3>
                            <Globe2 size={18} />
                            {challenge.domain}
                          </h3>
                          <GlassBadge
                            size="sm"
                            variant={
                              challenge.status === "valid" || challenge.ready
                                ? "success"
                                : "default"
                            }
                          >
                            {challenge.status === "valid"
                              ? "Verified"
                              : challenge.ready
                                ? "Detected"
                                : "Waiting"}
                          </GlassBadge>
                        </div>
                        {challenge.status === "valid" ? (
                          <p className="field-hint">
                            This authorization is already valid with Let&apos;s
                            Encrypt.
                          </p>
                        ) : (
                          <>
                            {order.method === "dns-01" ? (
                              <>
                                <TechnicalValue
                                  label="Record type"
                                  value="TXT"
                                />
                                <TechnicalValue
                                  label="Record name"
                                  value={challenge.recordName}
                                />
                                <TechnicalValue
                                  label="Record value"
                                  value={challenge.value}
                                />
                              </>
                            ) : (
                              <>
                                <TechnicalValue
                                  label="Challenge URL"
                                  value={challenge.url}
                                />
                                <TechnicalValue
                                  label="File name"
                                  value={challenge.token}
                                />
                                <TechnicalValue
                                  label="File content"
                                  value={challenge.value}
                                />
                                <DownloadButton
                                  name={challenge.token}
                                  content={challenge.value}
                                />
                              </>
                            )}
                            {challenge.message && (
                              <p
                                className={`challenge-message ${challenge.ready ? "text-success" : "text-muted"}`}
                              >
                                {challenge.ready ? (
                                  <CheckCircle2 size={16} />
                                ) : (
                                  <Clock3 size={16} />
                                )}
                                {challenge.message}
                              </p>
                            )}
                          </>
                        )}
                      </article>
                    ))}
                  </div>
                  <p className="field-hint">
                    {order.method === "dns-01"
                      ? "DNS changes may take several minutes. Some providers append your domain to the record name automatically."
                      : "HTTP redirects are followed only on the same hostname, up to three times. HTTPS redirects must have a trusted certificate."}
                  </p>
                  <div className="notice notice-info">
                    <KeyRound size={19} />
                    <div>
                      <p>
                        Keep this tab open. Your private key exists only in this
                        browser&apos;s memory and will be lost on refresh.
                      </p>
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          downloadFile("privkey.pem", privateKey)
                        }
                      >
                        <Download /> Back up private key
                      </GlassButton>
                    </div>
                  </div>
                  <div className="form-actions">
                    <GlassButton
                      disabled={!!busy}
                      onClick={() => action("check")}
                    >
                      <RotateCcw />{" "}
                      {order.method === "dns-01"
                        ? "Check DNS records"
                        : "Check challenge"}
                    </GlassButton>
                    <GlassButton
                      variant="primary"
                      disabled={!!busy || order.status !== "ready"}
                      onClick={() => action("verify")}
                    >
                      <ShieldCheck /> Verify with Let&apos;s Encrypt
                    </GlassButton>
                  </div>
                  <p className="field-hint">
                    Local detection is preliminary. Only Let&apos;s Encrypt can
                    verify ownership and issue a certificate.
                  </p>
                </>
              )}
              {activeStep === 3 && order && (
                <div className="issuance-state">
                  {order.status === "failed" ? (
                    <>
                      <div className="state-icon error-icon">
                        <TriangleAlert size={36} />
                      </div>
                      <h2>Verification could not finish.</h2>
                      <ErrorMessage
                        message={
                          order.error ??
                          "Let's Encrypt could not validate this order."
                        }
                      />
                      <GlassButton variant="primary" onClick={reset}>
                        <RotateCcw /> Create new order
                      </GlassButton>
                    </>
                  ) : (
                    <>
                      <div className="state-icon">
                        <ShieldCheck size={40} />
                        <span className="state-orbit" />
                      </div>
                      <span className="eyebrow">
                        Step 04 / Let&apos;s Encrypt
                      </span>
                      <h2>
                        {order.status === "issuing"
                          ? "Ownership verified. Issuing now."
                          : "Checking your domain ownership."}
                      </h2>
                      <p>
                        Let&apos;s Encrypt is independently checking your
                        request. Keep your challenge records in place.
                      </p>
                      <ul className="issuance-checklist">
                        <li>
                          <CheckCircle2 /> Local challenge detected
                        </li>
                        <li>
                          {order.status === "issuing" ? (
                            <CheckCircle2 />
                          ) : (
                            <LoaderCircle className="spin" />
                          )}{" "}
                          Domain ownership verification
                        </li>
                        <li>
                          {order.status === "issuing" ? (
                            <LoaderCircle className="spin" />
                          ) : (
                            <Circle />
                          )}{" "}
                          Sign and retrieve certificate
                        </li>
                      </ul>
                      {pollPaused && (
                        <GlassButton
                          onClick={() => action("progress")}
                          disabled={!!busy}
                        >
                          <RotateCcw /> Retry status check
                        </GlassButton>
                      )}
                      <p className="field-hint">
                        Checks stop after four minutes. No certificate is shown
                        until the CA confirms issuance.
                      </p>
                    </>
                  )}
                </div>
              )}
              {activeStep === 4 && order?.certificate && (
                <>
                  <div className="success-heading">
                    <div className="success-mark">
                      <Check size={30} />
                    </div>
                    <span className="eyebrow">Step 05 / Ready to install</span>
                    <h2>One more secure connection.</h2>
                    <p>
                      Your certificate has been issued through Let&apos;s
                      Encrypt.
                    </p>
                    <div className="issued-domains">
                      {order.domains.map((domain) => (
                        <GlassBadge key={domain} variant="success" size="sm">
                          {domain}
                        </GlassBadge>
                      ))}
                    </div>
                  </div>
                  <dl className="certificate-summary">
                    <div>
                      <dt>Certificate authority</dt>
                      <dd>
                        Let&apos;s Encrypt{" "}
                        {environment === "staging" ? "(staging)" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Valid until</dt>
                      <dd>
                        {new Date(
                          order.certificate.validUntil,
                        ).toLocaleDateString(undefined, {
                          dateStyle: "medium",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>Key type</dt>
                      <dd>
                        {order.keyType === "ec256" ? "ECDSA P-256" : "RSA 2048"}
                      </dd>
                    </div>
                  </dl>
                  <div className="notice notice-warning">
                    <KeyRound size={19} />
                    <p>
                      <strong>Keep your private key private.</strong> Anyone
                      with access to this file may impersonate your website.
                      Download your files before leaving this page.
                    </p>
                  </div>
                  <div className="download-grid">
                    {Object.entries(
                      certificateBundle(
                        privateKey,
                        order.certificate,
                        environment === "staging",
                      ),
                    )
                      .filter(([name]) => name !== "README.txt")
                      .map(([name, content]) => (
                        <article className="download-card" key={name}>
                          <div className="download-heading">
                            {name === "privkey.pem" ? (
                              <FileKey2 size={24} />
                            ) : (
                              <FileText size={24} />
                            )}
                            <div>
                              <h3>
                                {name === "privkey.pem"
                                  ? "Private key"
                                  : name === "cert.pem"
                                    ? "Certificate"
                                    : name === "chain.pem"
                                      ? "Certificate chain"
                                      : "Full chain"}
                              </h3>
                              <code>{name}</code>
                            </div>
                          </div>
                          <div className="download-actions">
                            <DownloadButton name={name} content={content} />
                            <CopyButton
                              value={content}
                              label={`Copy ${name}`}
                            />
                          </div>
                          <details>
                            <summary>View PEM</summary>
                            <textarea
                              aria-label={`${name} contents`}
                              readOnly
                              value={content}
                              spellCheck={false}
                            />
                          </details>
                        </article>
                      ))}
                  </div>
                  <div className="form-actions">
                    <Link href="/guides" className="text-link">
                      Installation guides <ArrowRight size={17} />
                    </Link>
                    <GlassButton variant="primary" onClick={downloadZip}>
                      <Download /> Download all files (.zip)
                    </GlassButton>
                  </div>
                  <p className="field-hint">
                    You can remove the temporary challenge records now.
                    Certificates are not automatically renewed.
                  </p>
                  <GlassButton variant="ghost" onClick={reset}>
                    <Plus /> Create another certificate
                  </GlassButton>
                </>
              )}
            </>
          )}
          {busy && (
            <div className="busy-state" role="status">
              <LoaderCircle size={21} className="spin" />
              <div>
                <strong>{busy}</strong>
                <span>
                  Secure operation in progress. Please keep this tab open.
                </span>
              </div>
            </div>
          )}
          {error && <ErrorMessage message={error} />}
        </div>
        <aside className="order-summary">
          <div className="summary-title">
            <ShieldCheck size={20} />
            <h2>Your certificate</h2>
          </div>
          <dl>
            <div>
              <dt>Issuer</dt>
              <dd>Let&apos;s Encrypt</dd>
            </div>
            <div>
              <dt>Certificate type</dt>
              <dd>Domain validated (DV)</dd>
            </div>
            <div>
              <dt>Private key</dt>
              <dd>
                {keyType === "ec256" ? "ECDSA P-256" : "RSA 2048"}
                <small>Generated in your browser</small>
              </dd>
            </div>
            <div>
              <dt>Domains</dt>
              <dd>
                {(
                  order?.domains ??
                  domains.map((domain) => domain.value).filter(Boolean)
                ).length || "None yet"}
              </dd>
            </div>
            <div className="summary-price">
              <dt>Total cost</dt>
              <dd>
                Free<span>No payment required</span>
              </dd>
            </div>
          </dl>
          {order && order.status !== "issued" && secondsLeft !== null && (
            <div
              className={`expiration ${isExpired ? "text-error" : ""}`}
              role="timer"
              aria-label="Order expiration"
            >
              <Clock3 size={16} />
              {isExpired
                ? "Order expired"
                : `Expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
            </div>
          )}
          <div className="summary-note">
            <Zap size={18} />
            <p>
              No account required.
              <br />
              No private key uploads.
            </p>
          </div>
          <Link className="text-link small" href="/guides" target="_blank">
            Need installation help? <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
