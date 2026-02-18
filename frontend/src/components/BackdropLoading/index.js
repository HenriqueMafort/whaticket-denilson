import React, { useEffect, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import logo from "../../assets/logo.png";

const useStyles = makeStyles(() => ({
	backdrop: {
		position: "fixed",
		top: 0,
		left: 0,
		width: "100vw",
		height: "100vh",
		background: "linear-gradient(135deg, #1565C0 0%, #1976D2 40%, #42A5F5 100%)",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		zIndex: 9999,
	},
	logoWrapper: {
		width: 90,
		height: 90,
		borderRadius: 22,
		background: "rgba(255,255,255,0.18)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 24,
		boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
		backdropFilter: "blur(8px)",
		animation: "$pulse 2s ease-in-out infinite",
	},
	logo: {
		width: 56,
		height: 56,
		objectFit: "contain",
	},
	text: {
		color: "rgba(255,255,255,0.92)",
		fontSize: 16,
		fontFamily: "Inter, Roboto, sans-serif",
		fontWeight: 400,
		letterSpacing: "0.02em",
		marginBottom: 28,
	},
	spinnerWrapper: {
		marginBottom: 16,
	},
	spinner: {
		width: 32,
		height: 32,
		border: "3px solid rgba(255,255,255,0.3)",
		borderTop: "3px solid #ffffff",
		borderRadius: "50%",
		animation: "$spin 0.9s linear infinite",
	},
	progressBar: {
		width: 180,
		height: 4,
		background: "rgba(255,255,255,0.25)",
		borderRadius: 4,
		overflow: "hidden",
		marginTop: 8,
	},
	progressFill: {
		height: "100%",
		borderRadius: 4,
		background: "rgba(255,255,255,0.85)",
		animation: "$progress 2.5s ease-in-out infinite",
	},
	redirectText: {
		color: "rgba(255,255,255,0.65)",
		fontSize: 13,
		fontFamily: "Inter, Roboto, sans-serif",
		marginTop: 16,
		animation: "$fadeInOut 2.5s ease-in-out infinite",
	},
	"@keyframes spin": {
		"0%": { transform: "rotate(0deg)" },
		"100%": { transform: "rotate(360deg)" },
	},
	"@keyframes pulse": {
		"0%": { boxShadow: "0 8px 32px rgba(0,0,0,0.18)" },
		"50%": { boxShadow: "0 8px 48px rgba(255,255,255,0.25)" },
		"100%": { boxShadow: "0 8px 32px rgba(0,0,0,0.18)" },
	},
	"@keyframes progress": {
		"0%": { width: "0%", marginLeft: "0%" },
		"50%": { width: "70%", marginLeft: "15%" },
		"100%": { width: "0%", marginLeft: "100%" },
	},
	"@keyframes fadeInOut": {
		"0%": { opacity: 0.4 },
		"50%": { opacity: 1 },
		"100%": { opacity: 0.4 },
	},
}));

const BackdropLoading = () => {
	const classes = useStyles();
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setProgress((prev) => {
				if (prev >= 100) return 0;
				return prev + 2;
			});
		}, 50);
		return () => clearInterval(timer);
	}, []);

	return (
		<div className={classes.backdrop}>
			<div className={classes.logoWrapper}>
				<img src={logo} alt="Logo" className={classes.logo} />
			</div>
			<div className={classes.text}>Carregando sua experiência...</div>
			<div className={classes.spinnerWrapper}>
				<div className={classes.spinner} />
			</div>
			<div className={classes.progressBar}>
				<div
					className={classes.progressFill}
					style={{ width: `${progress}%`, marginLeft: 0, transition: "width 0.05s linear" }}
				/>
			</div>
			<div className={classes.redirectText}>Redirecionando...</div>
		</div>
	);
};

export default BackdropLoading;
