import { styled } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';

const TicketAdvancedLayout = styled(Paper)(({ hideHeader }) => ({
    height: `calc(100% - 48px)`,
    display: "grid",
    gridTemplateRows: hideHeader ? "1fr" : "56px 1fr"
}))

export default TicketAdvancedLayout;
