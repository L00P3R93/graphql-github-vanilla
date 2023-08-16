import React, {Component} from 'react'
import axios from 'axios';

const TITLE = 'GraphQL Github Client'

const axiosGithubGraphQL = axios.create({
	baseURL: 'https://api.github.com/graphql',
	headers: {
		Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`
	}
})

const GET_ISSUES_OF_REPOSITORY = `
	query($organization: String!, $repository: String!, $cursor: String){
		organization(login: $organization){
			name
			url
			repository(name: $repository){
				name
				url
				issues(last: 5, after: $cursor, states: [OPEN]){
					edges{
						node{
							id
							title
							url
							reactions(last: 3){
								edges {
									node {
										id
										content
									}
								}
							}
						}
					}
					totalCount
					pageInfo {
						endCursor
						hasNextPage
					}
				}
			}
		}
	}
`;

const getIssuesOfRepository = (path, cursor) => {
	const [organization, repository] = path.split('/')

	return axiosGithubGraphQL.post('', {
		query: GET_ISSUES_OF_REPOSITORY,
		variables: {organization, repository, cursor},
	})
}

const resolveIssuesQuery = (queryResult, cursor) => state => {
	const {data, errors} = queryResult.data	
	if(!cursor){
		return {
			organization: data.organization,
			errors
		};
	}
	const {edges: oldIssues} = state.organization.repository.issues;
	const {edges: newIssues} = data.organization.repository.issues;
	const updatedIssues = [...oldIssues, ...newIssues]

	return {
		organization: {
			...data.organization,
			repository: {
				...data.organization.repository,
				issues: {
					...data.organization.repository.issues,
					edges: updatedIssues
				},
			},
		},
		errors
	};
};

class App extends Component {
	state = {
		path: 'the-road-to-learn-react/the-road-to-learn-react',
		organization: null,
		errors: null,
	};

	componentDidMount() {
		this.onFetchFromGithub(this.state.path);
	}

	onChange = event => {
		this.setState({path: event.target.value })
	}

	onSubmit = event => {
		this.onFetchFromGithub(this.state.path)
		event.preventDefault()
	}

	onFetchFromGithub = (path, cursor) => {
		getIssuesOfRepository(path, cursor).then(queryResult => 
			this.setState(resolveIssuesQuery(queryResult, cursor))
		)
	}

	onFetchMoreIssues = () => {
		const {endCursor} = this.state.organization.repository.issues.pageInfo
		this.onFetchFromGithub(this.state.path, endCursor)
	}

	render() {
		const {path, organization, errors} = this.state
		return (
			<div>
				<h1>{TITLE}</h1>
				<form onSubmit={this.onSubmit}>
					<label htmlFor='url'>
						Show open issues for https://github.com/
					</label>
					<input 
						id="url" 
						type="text" 
						value={path}
						onChange={this.onChange} 
						style={{width: '300px'}} 
					/>
					<button type='submit'>Search</button>
				</form>
				<hr/>
				{organization 
				? (
					<Organization 
						organization={organization} 
						errors={errors} 
						onFetchMoreIssues={this.onFetchMoreIssues}
					/>
				) : (
					<p>No Information yet ...</p>
				)}
			</div>
		);
	}
}

const Organization = ({organization, errors, onFetchMoreIssues}) => {
	if(errors){
		return(
			<p>
				<strong>Oops! Something Went Wrong</strong>
				{errors.map(error => error.message)}
			</p>
		)
	}
	return (
		<div>
			<p>
				<strong>Issues from Organization:&nbsp;</strong>
				<a href={organization.url}>{organization.name}</a>
			</p>
			<Repository 
				repository={organization.repository} 
				onFetchMoreIssues={onFetchMoreIssues} />
		</div>
	)
}

const Repository = ({repository, onFetchMoreIssues}) => (
	<div>
		<p>
			<strong>In Repository:&nbsp;</strong>
			<a href={repository}>{repository.name}</a>
		</p>
		<List list={repository} />
		<hr/>
		{repository.issues.pageInfo.hasNextPage && (
			<button onClick={onFetchMoreIssues}>More...</button>
		)}
		
	</div>
)


const List = ({list}) => (
	<ul>
		{list.issues.edges.map(issue => (
			<Item item={issue}/>
		))}
	</ul>
)

const Item = ({item}) => (
	<li key={item.node.id}>
		<a href={item.node.url}>{item.node.title}</a>
		<ul>
			{item.node.reactions.edges.map(reaction => (
				<li key={reaction.node.id}>{reaction.node.content}</li>
			))}
		</ul>
	</li>
)


export default App;

