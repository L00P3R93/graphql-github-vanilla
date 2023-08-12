import React, {Component} from 'react'
import axios from 'axios';

const TITLE = 'React GraphQL Github Client'

const axiosGithubGraphQL = axios.create({
	baseURL: 'https://api.github.com/graphql',
	headers: {
		Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`
	}
})
function App() {
	return (
		<div>
			<h1>{TITLE}</h1>
			<form onSubmit={this.onSubmit}>
				<label htmlFor='url'>
					Show open issues for https://github.com/
				</label>
			</form>
		</div>
	);
}

export default App;
